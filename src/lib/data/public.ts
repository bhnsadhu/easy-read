import "server-only";
import { withDb } from "@/lib/db";
import type { QuickCheck, SectionContent, WordPreviewEntry } from "@/lib/content/types";
import type { Supports } from "./types";

const anon = { role: "anon" as const };

export type PublicClass = {
  name: string;
  grade_band: "3-5" | "6-8" | "9-12";
  handle: string;
  theme: string;
  welcome: string | null;
  materials: { token: string; title: string; listen_seconds: number; section_count: number; language: string; published_at: string | null }[];
};

export type PublicMaterial = {
  token: string;
  title: string;
  language: string;
  direction: "ltr" | "rtl";
  supports: Supports;
  tldr: string[] | null;
  word_preview: WordPreviewEntry[] | null;
  assignment_steps: string[] | null;
  image_descriptions: string[] | null;
  listen_seconds: number;
  updated_at: string;
  class: { name: string; handle: string; theme: string; grade_band: "3-5" | "6-8" | "9-12" } | null;
  sections: { id: string; position: number; title: string | null; about: string | null; original: SectionContent; levels: { medium?: SectionContent; simple?: SectionContent }; quick_checks: QuickCheck[] }[];
};

export async function getPublicClass(handle: string): Promise<PublicClass | null> {
  const r = await withDb(anon, (q) => q<{ c: PublicClass | null }>("select public_class($1) as c", [handle]));
  return r.rows[0]?.c ?? null;
}

export async function getPublicMaterial(token: string): Promise<PublicMaterial | null> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const r = await withDb(anon, (q) => q<{ m: PublicMaterial | null }>("select public_material($1) as m", [token]));
  return r.rows[0]?.m ?? null;
}

export async function getHandleByCode(code: string): Promise<string | null> {
  const r = await withDb(anon, (q) => q<{ h: string | null }>("select public_class_by_code($1) as h", [code]));
  return r.rows[0]?.h ?? null;
}
