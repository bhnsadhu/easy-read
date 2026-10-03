import { z } from "zod";
import { sectionContent, type SectionContent } from "@/lib/content/types";

export type RewriteLevel = "medium" | "simple";

export type SectionTask = {
  title?: string;
  content: SectionContent;
  language: string;
  gradeBand: "3-5" | "6-8" | "9-12" | null;
  levels: RewriteLevel[];
  wantQuickChecks: boolean;
  // Fact Guard retry: facts the previous attempt dropped, by level.
  missing?: Partial<Record<RewriteLevel, string[]>>;
};

export const sectionResultSchema = z.object({
  title: z.string().min(1).max(120),
  about: z.string().min(1).max(200),
  medium: sectionContent.nullable(),
  simple: sectionContent.nullable(),
  quickChecks: z
    .array(
      z.object({
        question: z.string().min(1).max(400),
        options: z.array(z.string().min(1).max(200)).min(2).max(4),
        answerIndex: z.number().int().min(0).max(3),
      }),
    )
    .max(2),
});
export type SectionResult = z.infer<typeof sectionResultSchema>;

export type MaterialTask = {
  title?: string;
  language: string;
  sections: { title: string; text: string }[];
  wordCandidates: { word: string; sentences: string[] }[];
  wants: { tldr: boolean; words: boolean; steps: boolean };
};

export const materialResultSchema = z.object({
  title: z.string().min(1).max(120),
  isAssignment: z.boolean(),
  tldr: z.array(z.string().min(1).max(240)).max(3),
  words: z
    .array(
      z.object({
        word: z.string().min(1).max(60),
        // null = the text does not define it; the teacher should.
        definition: z.string().max(300).nullable(),
        example: z.string().max(400).nullable(),
      }),
    )
    .max(8),
  assignmentSteps: z.array(z.string().min(1).max(240)).max(30),
});
export type MaterialResult = z.infer<typeof materialResultSchema>;

export type VisionTask = {
  kind: "pdf" | "image";
  data: Uint8Array;
  mime: string;
  hint?: string;
};

export const visionResultSchema = z.object({
  text: z.string(),
  imageDescriptions: z.array(z.string().max(500)).max(40),
  language: z.string().min(2).max(8),
  warnings: z.array(z.string().max(200)).max(20),
});
export type VisionResult = z.infer<typeof visionResultSchema>;

export class LlmError extends Error {
  constructor(
    public code: "timeout" | "rate_limited" | "invalid_output" | "refused" | "unavailable" | "too_large",
    message: string,
    public retryable: boolean,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

export interface LlmProvider {
  readonly name: string;
  rewriteSection(task: SectionTask): Promise<SectionResult>;
  summarizeMaterial(task: MaterialTask): Promise<MaterialResult>;
  extractFromVision(task: VisionTask): Promise<VisionResult>;
}
