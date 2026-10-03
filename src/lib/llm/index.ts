import "server-only";
import { isMockLlm, serverEnv } from "@/lib/env";
import type { LlmProvider } from "./types";

export type { LlmProvider, SectionTask, SectionResult, MaterialTask, MaterialResult, VisionTask, VisionResult, RewriteLevel } from "./types";
export { LlmError } from "./types";

const g = globalThis as unknown as { __readeasyLlm?: LlmProvider };

export async function getLlm(): Promise<LlmProvider> {
  if (g.__readeasyLlm) return g.__readeasyLlm;
  if (isMockLlm()) {
    const { MockProvider } = await import("./mock");
    g.__readeasyLlm = new MockProvider({ delayMs: process.env.MOCK_LLM_DELAY_MS ? Number(process.env.MOCK_LLM_DELAY_MS) : 0 });
  } else {
    const { AnthropicProvider } = await import("./anthropic");
    const env = serverEnv();
    g.__readeasyLlm = new AnthropicProvider({ apiKey: env.ANTHROPIC_API_KEY!, model: env.LLM_MODEL || undefined });
  }
  return g.__readeasyLlm;
}
