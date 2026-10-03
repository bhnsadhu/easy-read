import { z } from "zod";

// The one content model used everywhere: parsers produce it, the LLM returns
// it (structured output), the database stores it, the reader renders it.
// Paragraph text is stored pre-segmented into sentences so read-aloud and
// highlighting never depend on client-side segmentation.

export const headingBlock = z.object({
  type: z.literal("heading"),
  level: z.union([z.literal(2), z.literal(3)]),
  text: z.string().min(1).max(300),
});

export const paragraphBlock = z.object({
  type: z.literal("paragraph"),
  sentences: z.array(z.string().min(1).max(1000)).min(1).max(60),
});

export const listBlock = z.object({
  type: z.literal("list"),
  ordered: z.boolean(),
  // Each item is a list of sentences.
  items: z.array(z.array(z.string().min(1).max(1000)).min(1).max(20)).min(1).max(50),
});

export const mathBlock = z.object({
  type: z.literal("math"),
  // Preserved verbatim from the source; never rewritten.
  text: z.string().min(1).max(2000),
});

export const tableBlock = z.object({
  type: z.literal("table"),
  header: z.array(z.string().max(200)).max(12).optional(),
  rows: z.array(z.array(z.string().max(500)).max(12)).min(1).max(100),
});

export const imageBlock = z.object({
  type: z.literal("image"),
  alt: z.string().max(500),
  // True when the description was written by the model and awaits teacher review.
  ai: z.boolean(),
  assetId: z.string().optional(),
});

export const block = z.discriminatedUnion("type", [headingBlock, paragraphBlock, listBlock, mathBlock, tableBlock, imageBlock]);
export type Block = z.infer<typeof block>;

export const sectionContent = z.object({ blocks: z.array(block).min(1).max(80) });
export type SectionContent = z.infer<typeof sectionContent>;

export const levelKey = z.enum(["original", "medium", "simple"]);
export type LevelKey = z.infer<typeof levelKey>;

export const quickCheck = z.object({
  id: z.string(),
  question: z.string().min(1).max(400),
  options: z.array(z.string().min(1).max(200)).min(2).max(4),
  answerIndex: z.number().int().min(0).max(3),
  // Set by validation: the answer is supported by the section text.
  supported: z.boolean(),
});
export type QuickCheck = z.infer<typeof quickCheck>;

export const factGuardResult = z.object({
  status: z.enum(["unchecked", "passed", "retried", "flagged"]),
  // Facts from the source that are missing from a rewrite, per level.
  missing: z.array(z.object({ level: levelKey, items: z.array(z.string()) })),
  acknowledged: z.boolean(),
});
export type FactGuardResult = z.infer<typeof factGuardResult>;

export const wordPreviewEntry = z.object({
  word: z.string().min(1).max(60),
  syllables: z.array(z.string().min(1)).min(1),
  // null means "teacher should define": the text did not define it.
  definition: z.string().max(300).nullable(),
  example: z.string().max(400).nullable(),
});
export type WordPreviewEntry = z.infer<typeof wordPreviewEntry>;

export const tldr = z.array(z.string().min(1).max(240)).min(1).max(3);
export const assignmentSteps = z.array(z.string().min(1).max(240)).max(30);

// Produced by every parser (PDF, DOCX, image, paste, URL). Plain text, never HTML.
export type ExtractedDocument = {
  text: string;
  title?: string;
  language?: string;
  pages?: number;
  // Parser could not get usable text; the file should be sent to vision.
  needsVision?: boolean;
  // Plain, teacher-facing notes: "Page 3 looks like a table", "Math was kept as written".
  warnings: string[];
  images?: { assetId: string; page?: number }[];
};

// Readability estimate shown to teachers next to each level.
export type Readability = { grade: number | null; words: number };

export type SectionDraft = {
  position: number;
  title: string;
  original: SectionContent;
};

export const SECTION_TARGET_WORDS = { min: 100, max: 200 } as const;
export const SHORT_MATERIAL_WORDS = 120; // below this, skip sectioning
