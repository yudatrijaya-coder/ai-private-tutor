import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming, ChatCompletionCreateParamsStreaming } from "openai/resources/chat/completions";
import type { AgentRole, ChatMessage, LLMCallOptions, ModelPricing } from "./types";

// ─── Re-export all types ──────────────────────────────────────
export * from "./types";

// ─── OpenRouter Client ────────────────────────────────────────
const baseURL = "https://openrouter.ai/api/v1";
const apiKey = process.env.OPENROUTER_API_KEY;

/** True if the API key is configured */
export const isLLMReady = Boolean(apiKey);

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      baseURL,
      apiKey: apiKey || "sk-noop",
      defaultHeaders: {
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3001",
        "X-Title": "AI Private Tutor",
      },
    });
  }
  return _client;
}

// ─── Model Routing ────────────────────────────────────────────

/** Primary model per agent role */
export const MODEL_ROUTES: Record<AgentRole, string> = {
  tutor: "openai/gpt-4o-mini",
  curriculum: "deepseek/deepseek-chat",
  content: "google/gemini-1.5-flash",
  assessment: "openai/gpt-4o-mini",
  guardian: "deepseek/deepseek-chat",
  media_script: "openai/gpt-4o-mini",
};

/**
 * Fallback chain per agent role (primary → secondary → tertiary).
 * Tried in order until one succeeds.
 */
export const FALLBACK_CHAIN: Record<AgentRole, string[]> = {
  tutor: [
    "openai/gpt-4o-mini",
    "google/gemini-2.0-flash-001",
    "mistral/mistral-small-3.1-24b-instruct",
  ],
  curriculum: [
    "deepseek/deepseek-chat",
    "google/gemini-2.0-flash-001",
  ],
  content: [
    "google/gemini-1.5-flash",
    "deepseek/deepseek-chat",
  ],
  assessment: [
    "openai/gpt-4o-mini",
    "google/gemini-2.0-flash-001",
  ],
  guardian: [
    "deepseek/deepseek-chat",
    "google/gemini-2.0-flash-001",
  ],
  media_script: [
    "openai/gpt-4o-mini",
    "google/gemini-2.0-flash-001",
  ],
};

// ─── Per‑model pricing (USD per 1K tokens, approx OpenRouter rates) ───

const MODEL_PRICING: Record<string, ModelPricing> = {
  "openai/gpt-4o-mini":               { input: 0.00015, output: 0.00060 },
  "google/gemini-2.0-flash-001":      { input: 0.00010, output: 0.00040 },
  "google/gemini-1.5-flash":          { input: 0.000075, output: 0.00030 },
  "deepseek/deepseek-chat":           { input: 0.00013, output: 0.00050 },
  "mistral/mistral-small-3.1-24b-instruct": { input: 0.00020, output: 0.00060 },
};

// ─── Core: callLLM (non‑streaming, with fallback) ─────────────

/**
 * Call the LLM with automatic fallback.
 * Tries models in the role's fallback chain in order until one succeeds.
 *
 * @throws if all models in the chain fail.
 * @returns the response text, or `null` if the model returned an empty choice.
 */
export async function callLLM(
  role: AgentRole,
  messages: ChatMessage[],
  options?: LLMCallOptions,
): Promise<string | null> {
  const models = FALLBACK_CHAIN[role];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const body: ChatCompletionCreateParamsNonStreaming = {
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
      };

      const response = await getClient().chat.completions.create(body);
      return response.choices[0]?.message?.content ?? null;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[LLM] ${model} failed: ${lastError.message}. Trying fallback…`);
    }
  }

  console.error(`[LLM] All models failed for "${role}":`, lastError);
  throw lastError ?? new Error(`All models failed for role "${role}"`);
}

// ─── Core: callLLMStream (streaming, with fallback) ───────────

/**
 * Call the LLM with streaming and automatic fallback.
 * Yields tokens from each model in the role's fallback chain.
 * If a model fails mid‑stream the generator exits (throw to caller).
 *
 * @throws if all models fail to start streaming.
 */
export async function* callLLMStream(
  role: AgentRole,
  messages: ChatMessage[],
  options?: LLMCallOptions,
): AsyncGenerator<string> {
  const models = FALLBACK_CHAIN[role];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const body: ChatCompletionCreateParamsStreaming = {
        model,
        messages,
        stream: true,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
      };

      const stream = await getClient().chat.completions.create(body);

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) yield content;
      }
      return; // success — exit generator
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[LLM] ${model} streaming failed: ${lastError.message}. Trying fallback…`);
    }
  }

  throw lastError ?? new Error(`All models failed to stream for role "${role}"`);
}

// ─── Cost Estimator ───────────────────────────────────────────

/**
 * Rough cost estimate for a call using the role's **primary** model.
 *
 * @returns estimated USD cost (0 if pricing data is missing for the model).
 */
export function estimateCost(
  role: AgentRole,
  inputTokens: number,
  outputTokens: number,
): number {
  const model = FALLBACK_CHAIN[role][0];
  const rate = MODEL_PRICING[model];
  if (!rate) return 0;

  return (inputTokens / 1000) * rate.input + (outputTokens / 1000) * rate.output;
}

// ─── Safe Init: noop sentinel when key is missing ─────────────

/** Sentinel object returned when OPENROUTER_API_KEY is not set */
export const LLM_NOT_CONFIGURED = {
  isReady: false as const,
  callLLM: async <T = null>(): Promise<T> => {
    console.warn(
      "[LLM] OPENROUTER_API_KEY is not set. Set it in .env to use LLM features.",
    );
    return null as T;
  },
  callLLMStream: async function* (): AsyncGenerator<string> {
    console.warn(
      "[LLM] OPENROUTER_API_KEY is not set. Set it in .env to use LLM features.",
    );
    // yield nothing
  },
  estimateCost: (): number => 0,
};

/**
 * Get the appropriate LLM interface — real client or noop sentinel.
 * Use this instead of calling `callLLM`/`callLLMStream` directly when
 * you want guaranteed safe behaviour without checking `isLLMReady`
 * manually.
 *
 * @example
 *   const llm = getLLM();
 *   if (!llm.isReady) { /* show a friendly message *\/ }
 *   const reply = await llm.callLLM("tutor", messages);
 */
export function getLLM(): typeof LLM_NOT_CONFIGURED | {
  isReady: true;
  callLLM: typeof callLLM;
  callLLMStream: typeof callLLMStream;
  estimateCost: typeof estimateCost;
} {
  if (!isLLMReady) return LLM_NOT_CONFIGURED;
  return {
    isReady: true as const,
    callLLM,
    callLLMStream,
    estimateCost,
  };
}
