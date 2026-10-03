import "server-only";
import { chunkIntoSections, sanitizeContent, structureText } from "@/lib/text";
import type { SectionDraft } from "@/lib/content/types";
import { replaceSections, updateMaterial, type Owner } from "@/lib/data/materials";

// Turns the extracted source text into pending sections. Idempotent: calling it
// again replaces the sections and restarts processing.
export function draftsFromText(text: string): SectionDraft[] {
  const blocks = structureText(text);
  const sections = chunkIntoSections(blocks);
  return sections.map((s) => ({ ...s, original: sanitizeContent(s.original) }));
}

export async function prepareMaterial(owner: Owner, materialId: string, sourceText: string): Promise<number> {
  const drafts = draftsFromText(sourceText);
  await replaceSections(materialId, drafts);
  await updateMaterial(owner, materialId, { status: "processing", processingError: null });
  return drafts.length;
}
