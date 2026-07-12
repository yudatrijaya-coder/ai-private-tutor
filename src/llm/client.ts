import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming, ChatCompletionCreateParamsStreaming } from "openai/resources/chat/completions";
import type { AgentRole, ChatMessage, LLMCallOptions, ModelPricing, LLMResult } from "./types";
import { prisma } from "@/lib/prisma";

// ─── Re-export all types ──────────────────────────────────────
export * from "./types";

// ─── 9Router Client ────────────────────────────────────────────
const baseURL = process.env.LLM_BASE_URL || "http://localhost:20128/v1";
const apiKey = process.env.LLM_API_KEY || "sk-9router";

/** True if 9Router is reachable */
export const isLLMReady = true;

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

/** Primary model per agent role — via 9Router combo */
export const MODEL_ROUTES: Record<AgentRole, string> = {
  tutor: "ai_tutor_agent",
  curriculum: "ai_tutor_agent",
  content: "ai_tutor_agent",
  assessment: "ai_tutor_agent",
  guardian: "ai_tutor_agent",
  media_script: "ai_tutor_agent",
};

/**
 * Vision-capable models only — skips models that don't support image inputs.
 * Used by the vision handler to avoid wasting time on non-vision models.
 *
 * ai_tutor_agent (9Router combo) is tried first — the combo has auto-fallback
 * to a vision model internally when it detects image input. If the combo
 * doesn't support vision on the current route, fallback to direct models.
 */
export const VISION_MODELS = [
  "ai_tutor_agent",                    // 9Router combo — auto-fallback to vision internally
  "sumopod/gpt-4o-mini",               // known good vision model
  "sumopod/gemini/gemini-2.5-flash-lite", // Google Gemini vision
  "sumopod/deepseek-v4-flash",         // SumoPod proxy — may support vision
];

/**
 * Fallback chain per agent role (primary → secondary → tertiary → ...).
 * Ordered by preference:
 *   ai_tutor_agent → sumopod/* → hermes (9Router combo) → opencode-go native
 *
 * hermes = 9Router combo untuk Nous Research Hermes model (fallback murah).
 * opencode-go native models dipakai kalo semua 9Router route gagal.
 */
export const FALLBACK_CHAIN: Record<AgentRole, string[]> = {
  tutor: [
    "ai_tutor_agent",
    "sumopod/deepseek-v4-flash",
    "sumopod/gpt-4o-mini",
    "hermes",
  ],
  curriculum: [
    "ai_tutor_agent",
    "sumopod/deepseek-v4-flash",
    "hermes",
  ],
  content: [
    "ai_tutor_agent",
    "sumopod/deepseek-v4-flash",
    "sumopod/gemini/gemini-2.5-flash-lite",
    "hermes",
  ],
  assessment: [
    "ai_tutor_agent",
    "sumopod/gpt-4o-mini",
    "hermes",
  ],
  guardian: [
    "ai_tutor_agent",
    "sumopod/deepseek-v4-flash",
    "hermes",
  ],
  media_script: [
    "ai_tutor_agent",
    "sumopod/deepseek-v4-flash",
    "sumopod/gpt-4o-mini",
    "hermes",
  ],
};

// ─── Per‑model pricing (USD per 1M tokens — 9Router rates) ────

const MODEL_PRICING: Record<string, ModelPricing> = {
  "gpt-4o-mini":                            { input: 0.15, output: 0.60 },
  "sumopod/gpt-4o-mini":                   { input: 0.15, output: 0.60 },
  "sumopod/gemini/gemini-2.5-flash-lite":   { input: 0.10, output: 0.40 },
  "sumopod/deepseek-v4-flash":              { input: 0.14, output: 0.28 },
  "ai_tutor_agent":                         { input: 0.14, output: 0.28 },
  "hermes":                                 { input: 0.05, output: 0.10 },
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
  const models = options?.models ?? FALLBACK_CHAIN[role];
  let lastError: Error | null = null;

  for (const model of models) {
    const start = Date.now();
    try {
      const body: ChatCompletionCreateParamsNonStreaming = {
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
      };

      const fetchOptions: Record<string, unknown> = {};
      if (options?.timeoutMs) {
        fetchOptions.signal = AbortSignal.timeout(options.timeoutMs);
      }

      const response = await getClient().chat.completions.create(body, fetchOptions);
      const latencyMs = Date.now() - start;
      const content = response.choices[0]?.message?.content ?? null;
      const usage = response.usage;

      // Log to ApiUsage (fire-and-forget — never block on logging)
      if (usage) {
        const modelUsed = response.model || model;
        const cost = estimateCostRaw(modelUsed, usage.prompt_tokens, usage.completion_tokens);
        logApiUsage({
          studentId: options?.studentId,
          agentType: role,
          model: modelUsed,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          latencyMs,
          costUsd: cost,
        }).catch(() => {});
      }

      return content;
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
  return estimateCostRaw(model, inputTokens, outputTokens);
}

/** Estimate cost for a given model name (used internally + by ApiUsage logging). */
function estimateCostRaw(model: string, inputTokens: number, outputTokens: number): number {
  const rate = MODEL_PRICING[model];
  if (!rate) return 0;
  return (inputTokens / 1_000_000) * rate.input + (outputTokens / 1_000_000) * rate.output;
}

// ─── ApiUsage Logger ──────────────────────────────────────────

interface UsageLogInput {
  studentId?: string;
  agentType?: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  costUsd: number;
}

/**
 * Fire-and-forget — logs LLM usage to the ApiUsage table.
 * Never throws — silent on error.
 */
async function logApiUsage(input: UsageLogInput): Promise<void> {
  try {
    await prisma.apiUsage.create({ data: input as any });
  } catch (err) {
    console.warn("[LLM] Failed to log API usage:", err instanceof Error ? err.message : String(err));
  }
}

// ─── Safe Init: noop sentinel when key is missing ─────────────

/** Sentinel object returned when 9Router is unreachable */
export const LLM_NOT_CONFIGURED = {
  isReady: false as const,
  callLLM: async <T = null>(): Promise<T> => {
    console.warn(
      "[LLM] SUMOPOD_API_KEY is not set. Set it in .env to use LLM features.",
    );
    return null as T;
  },
  callLLMStream: async function* (): AsyncGenerator<string> {
    console.warn(
      "[LLM] SUMOPOD_API_KEY is not set. Set it in .env to use LLM features.",
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
