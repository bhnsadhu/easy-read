import type { FactGuardResult, QuickCheck, SectionContent, WordPreviewEntry } from "@/lib/content/types";

export type GradeBand = "3-5" | "6-8" | "9-12";
export type MaterialStatus = "draft" | "processing" | "needs_review" | "published";
export type SectionStatus = "pending" | "processing" | "done" | "flagged" | "failed";
export type SourceType = "file" | "paste" | "url";

export type Supports = {
  levels: ("medium" | "simple")[];
  tldr: boolean;
  words: boolean;
  quick_checks: boolean;
  steps: boolean;
};

export const DEFAULT_SUPPORTS: Supports = { levels: ["medium", "simple"], tldr: true, words: true, quick_checks: true, steps: true };

export type ClassRow = {
  id: string;
  teacher_id: string;
  name: string;
  grade_band: GradeBand;
  handle: string;
  theme: string;
  welcome: string | null;
  code: string;
  created_at: string;
  updated_at: string;
  version: number;
};

export type MaterialRow = {
  id: string;
  teacher_id: string | null;
  draft_token: string | null;
  class_id: string | null;
  title: string;
  source_type: SourceType;
  source_name: string | null;
  source_language: string;
  direction: "ltr" | "rtl";
  source_text: string | null;
  content_hash: string | null;
  pii_report: unknown;
  supports: Supports;
  status: MaterialStatus;
  share_token: string;
  share_rotated_at: string | null;
  published_at: string | null;
  position: number;
  tldr: string[] | null;
  word_preview: WordPreviewEntry[] | null;
  assignment_steps: string[] | null;
  image_descriptions: string[] | null;
  listen_seconds: number;
  processing_error: string | null;
  created_at: string;
  updated_at: string;
  version: number;
};

export type SectionRow = {
  id: string;
  material_id: string;
  position: number;
  status: SectionStatus;
  attempts: number;
  lease_until: string | null;
  title: string | null;
  about: string | null;
  original: SectionContent;
  levels: { medium?: SectionContent; simple?: SectionContent };
  quick_checks: QuickCheck[];
  fact_guard: FactGuardResult;
  readability: { original?: number | null; medium?: number | null; simple?: number | null } | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  version: number;
};

export type MaterialSummary = Pick<MaterialRow, "id" | "class_id" | "title" | "status" | "source_type" | "updated_at" | "published_at" | "position" | "share_token" | "listen_seconds"> & {
  section_count: number;
  flagged_count: number;
};

export class ConflictError extends Error {
  constructor() {
    super("CONFLICT");
    this.name = "ConflictError";
  }
}

export class NotFoundError extends Error {
  constructor() {
    super("NOT_FOUND");
    this.name = "NotFoundError";
  }
}
