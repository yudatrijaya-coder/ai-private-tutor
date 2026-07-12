import type OpenAI from "openai";

/** Agent roles that map to specific LLM models */
export type AgentRole =
  | "tutor"
  | "curriculum"
  | "content"
  | "assessment"
  | "guardian"
  | "media_script";

/** Model routing map — primary model per role */
export type ModelRoutes = Record<AgentRole, string>;

/** Fallback chain — ordered list of models to try in order */
export type FallbackChain = Record<AgentRole, string[]>;

/** Per-token pricing for cost estimation */
export interface ModelPricing {
  input: number;  // USD per 1K input tokens
  output: number; // USD per 1K output tokens
}

/** Options for LLM calls */
export interface LLMCallOptions {
  temperature?: number;
  maxTokens?: number;
  /** studentId untuk logging ApiUsage — jika disediakan, otomatis dicatat */
  studentId?: string;
  /** timeout in milliseconds for the LLM request (default: none / SDK default) */
  timeoutMs?: number;
}

/** Result from an LLM call including usage data */
export interface LLMResult {
  content: string | null;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  costUsd: number;
}

/** Type alias for OpenAI messages */
export type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;
