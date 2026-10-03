import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import {
  LlmError,
  materialResultSchema,
  sectionResultSchema,
  visionResultSchema,
  type LlmProvider,
  type MaterialResult,
  type MaterialTask,
  type SectionResult,
  type SectionTask,
  type VisionResult,
  type VisionTask,
} from "./types";
import { MATERIAL_SYSTEM, SECTION_SYSTEM, VISION_SYSTEM, buildMaterialUserMessage, buildSectionUserMessage, buildVisionUserText } from "./prompts";

export const DEFAULT_MODEL = "claude-sonnet-5-5";
const REQUEST_TIMEOUT_MS = 90_000;

// Effort is the only sampling control on the 5.x family; older models take temperature.
function tuning(model: string) {
  const modern = /(sonnet|opus|fable)-5/.test(model);
  return modern ? { output_config: { effort: "low" as const } } : { temperature: 0.2 };
}

function toApiError(err: unknown): LlmError {
  if (err instanceof LlmError) return err;
  if (err instanceof Anthropic.RateLimitError) return new LlmError("rate_limited", "The AI service is busy.", true);
  if (err instanceof Anthropic.APIConnectionTimeoutError) return new LlmError("timeout", "The AI service timed out.", true);
  if (err instanceof Anthropic.BadRequestError) return new LlmError("too_large", err.message, false);
  if (err instanceof Anthropic.APIError) return new LlmError("unavailable", `AI service error ${err.status ?? ""}`.trim(), (err.status ?? 500) >= 500);
  if (err instanceof Anthropic.APIConnectionError) return new LlmError("unavailable", "Could not reach the AI service.", true);
  return new LlmError("unavailable", err instanceof Error ? err.message : "Unknown error", false);
}

export class AnthropicProvider implements LlmProvider {
  readonly name: string;
  private client: Anthropic;
  private model: string;

  constructor(opts: { apiKey: string; model?: string; client?: Anthropic }) {
    this.model = opts.model ?? DEFAULT_MODEL;
    this.name = `anthropic:${this.model}`;
    this.client = opts.client ?? new Anthropic({ apiKey: opts.apiKey, maxRetries: 2, timeout: REQUEST_TIMEOUT_MS });
  }

  private async parse<S extends z.ZodType>(
    schema: S,
    system: string,
    content: Anthropic.MessageParam["content"],
    maxTokens: number,
  ): Promise<z.infer<S>> {
    let response: Awaited<ReturnType<Anthropic["messages"]["parse"]>>;
    try {
      const t = tuning(this.model);
      response = await this.client.messages.parse({
        model: this.model,
        max_tokens: maxTokens,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content }],
        ...("temperature" in t ? { temperature: t.temperature } : {}),
        output_config: {
          format: zodOutputFormat(schema),
          ...("output_config" in t ? t.output_config : {}),
        },
      });
    } catch (err) {
      throw toApiError(err);
    }
    if (response.stop_reason === "refusal") {
      throw new LlmError("refused", "The AI declined to process this content.", false);
    }
    if (response.stop_reason === "max_tokens") {
      throw new LlmError("too_large", "The section was too long to adapt in one pass.", false);
    }
    const parsed = (response as { parsed_output?: unknown }).parsed_output;
    if (!parsed) throw new LlmError("invalid_output", "The AI returned something we could not read.", true);
    const checked = schema.safeParse(parsed);
    if (!checked.success) throw new LlmError("invalid_output", "The AI returned something we could not read.", true);
    return checked.data;
  }

  rewriteSection(task: SectionTask): Promise<SectionResult> {
    return this.parse(sectionResultSchema, SECTION_SYSTEM, buildSectionUserMessage(task), 8_000);
  }

  summarizeMaterial(task: MaterialTask): Promise<MaterialResult> {
    return this.parse(materialResultSchema, MATERIAL_SYSTEM, buildMaterialUserMessage(task), 4_000);
  }

  extractFromVision(task: VisionTask): Promise<VisionResult> {
    const data = Buffer.from(task.data).toString("base64");
    const block: Anthropic.ContentBlockParam =
      task.kind === "pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
        : {
            type: "image",
            source: { type: "base64", media_type: task.mime as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data },
          };
    return this.parse(visionResultSchema, VISION_SYSTEM, [block, { type: "text", text: buildVisionUserText(task) }], 16_000);
  }
}
