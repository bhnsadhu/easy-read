import "server-only";
import type { FactGuardResult, LevelKey, QuickCheck, SectionContent, WordPreviewEntry } from "@/lib/content/types";
import { getLlm, LlmError, type RewriteLevel, type SectionResult } from "@/lib/llm";
import {
  claimNextSection,
  completeSection,
  failSection,
  getMaterial,
  MAX_ATTEMPTS,
  sectionProgress,
  updateMaterial,
  type Owner,
} from "@/lib/data/materials";
import type { SectionRow } from "@/lib/data/types";
import { withDb } from "@/lib/db";
import {
  countWords,
  estimateReadability,
  factGuardSummary,
  findDefinitionInText,
  pickKeyWords,
  plainText,
  sanitizeContent,
  splitSentences,
  syllabify,
  validateQuickCheck,
  verifyFacts,
} from "@/lib/text";

export type Progress = {
  total: number;
  done: number;
  flagged: number;
  failed: number;
  processing: number;
  pending: number;
  status: "processing" | "needs_review" | "draft" | "failed";
};

const WORDS_PER_MINUTE = 150;

function qcId(sectionId: string, i: number): string {
  return `${sectionId.slice(0, 8)}-${i}`;
}

// Runs Fact Guard for one level; returns the content to store plus what went missing.
function guardLevel(original: SectionContent, rewritten: SectionContent | null): { content: SectionContent | null; missing: string[] } {
  if (!rewritten) return { content: null, missing: [] };
  const safe = sanitizeContent(rewritten);
  const { missing } = verifyFacts(plainText(original), plainText(safe));
  return { content: safe, missing: missing.map((f) => f.value) };
}

export async function adaptSection(section: SectionRow, opts: { language: string; gradeBand: "3-5" | "6-8" | "9-12" | null; levels: RewriteLevel[]; wantQuickChecks: boolean }) {
  const llm = await getLlm();
  const base = { title: section.title ?? undefined, content: section.original, language: opts.language, gradeBand: opts.gradeBand, levels: opts.levels, wantQuickChecks: opts.wantQuickChecks };

  let result: SectionResult = await llm.rewriteSection(base);
  let guarded = { medium: guardLevel(section.original, result.medium), simple: guardLevel(section.original, result.simple) };

  const missingNow = (g: typeof guarded) => ({
    ...(g.medium.missing.length ? { medium: g.medium.missing } : {}),
    ...(g.simple.missing.length ? { simple: g.simple.missing } : {}),
  });

  let missing = missingNow(guarded);
  let status: FactGuardResult["status"] = "passed";
  if (Object.keys(missing).length) {
    // One retry naming exactly what was dropped.
    const retry = await llm.rewriteSection({ ...base, missing });
    const retried = { medium: guardLevel(section.original, retry.medium), simple: guardLevel(section.original, retry.simple) };
    const retriedMissing = missingNow(retried);
    result = { ...retry, quickChecks: result.quickChecks.length ? result.quickChecks : retry.quickChecks };
    guarded = retried;
    missing = retriedMissing;
    status = Object.keys(retriedMissing).length ? "flagged" : "retried";
  }

  // A level that still drops facts keeps the original wording and is flagged.
  const levels: SectionRow["levels"] = {};
  for (const level of opts.levels) {
    const g = guarded[level];
    if (!g.content) continue;
    levels[level] = g.missing.length ? section.original : g.content;
  }

  const quickChecks: QuickCheck[] = result.quickChecks.map((qc, i) => validateQuickCheck(section.original, { ...qc, id: qcId(section.id, i) }));

  const readability = {
    original: estimateReadability(section.original).grade,
    ...(levels.medium ? { medium: estimateReadability(levels.medium).grade } : {}),
    ...(levels.simple ? { simple: estimateReadability(levels.simple).grade } : {}),
  };

  const factGuard: FactGuardResult = {
    status,
    missing: (Object.entries(missing) as [LevelKey, string[]][]).map(([level, items]) => ({ level, items })),
    acknowledged: false,
  };

  return {
    title: result.title,
    about: result.about,
    levels,
    quickChecks,
    factGuard,
    readability,
    status: status === "flagged" ? ("flagged" as const) : ("done" as const),
  };
}

export async function processOneSection(owner: Owner, materialId: string): Promise<{ claimed: boolean; progress: Progress }> {
  const material = await getMaterial(owner, materialId);
  const section = await claimNextSection(materialId);
  if (!section) {
    const progress = await finalizeIfDone(owner, materialId);
    return { claimed: false, progress };
  }

  const gradeBand = material.class_id ? await classGradeBand(material.class_id) : null;
  try {
    const adapted = await adaptSection(section, {
      language: material.source_language,
      gradeBand,
      levels: material.supports.levels,
      wantQuickChecks: material.supports.quick_checks,
    });
    await completeSection(section.id, adapted);
  } catch (err) {
    const retryable = err instanceof LlmError ? err.retryable : true;
    const final = !retryable || section.attempts >= MAX_ATTEMPTS;
    const message = err instanceof Error ? err.message : "Unknown error";
    await failSection(section.id, message, final);
  }
  const progress = await finalizeIfDone(owner, materialId);
  return { claimed: true, progress };
}

async function classGradeBand(classId: string): Promise<"3-5" | "6-8" | "9-12" | null> {
  const r = await withDb({ role: "service" }, (q) => q<{ grade_band: "3-5" | "6-8" | "9-12" }>("select grade_band from classes where id = $1", [classId]));
  return r.rows[0]?.grade_band ?? null;
}

async function finalizeIfDone(owner: Owner, materialId: string): Promise<Progress> {
  const p = await sectionProgress(materialId);
  const material = await getMaterial(owner, materialId);
  if (p.pending > 0 || p.processing > 0) {
    if (material.status !== "processing") await updateMaterial(owner, materialId, { status: "processing" });
    return { ...p, status: "processing" };
  }
  if (material.status === "processing") {
    await summarize(owner, materialId);
    const status = p.flagged > 0 || p.failed > 0 ? "needs_review" : "draft";
    await updateMaterial(owner, materialId, { status });
    return { ...p, status };
  }
  const status = material.status === "published" ? "draft" : material.status;
  return { ...p, status: p.total > 0 && p.failed === p.total ? "failed" : status };
}

async function summarize(owner: Owner, materialId: string): Promise<void> {
  const llm = await getLlm();
  const material = await getMaterial(owner, materialId);
  const sections = await withDb({ role: "service" }, (q) =>
    q<SectionRow>("select * from sections where material_id = $1 and status in ('done','flagged','failed') order by position", [materialId]),
  );
  const texts = sections.rows.map((s) => ({ title: s.title ?? `Part ${s.position + 1}`, text: plainText(s.original) }));
  const allText = texts.map((t) => t.text).join("\n\n");
  const sentences = splitSentences(allText);
  const candidates = material.supports.words ? pickKeyWords(allText, 8) : [];
  const wordCandidates = candidates.map((word) => ({
    word,
    sentences: sentences.filter((s) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(s)).slice(0, 4),
  }));

  let tldr: string[] | null = null;
  let wordPreview: WordPreviewEntry[] | null = null;
  let assignmentSteps: string[] | null = null;
  let title = material.title;
  try {
    const summary = await llm.summarizeMaterial({
      title: material.title === "Untitled" ? "" : material.title,
      language: material.source_language,
      sections: texts,
      wordCandidates,
      wants: { tldr: material.supports.tldr, words: material.supports.words, steps: material.supports.steps },
    });
    if (material.title === "Untitled" && summary.title) title = summary.title.slice(0, 200);
    tldr = material.supports.tldr ? summary.tldr : null;
    if (material.supports.words) {
      wordPreview = summary.words.slice(0, 8).map((w) => {
        const local = findDefinitionInText(w.word, sentences);
        return {
          word: w.word,
          syllables: syllabify(w.word, material.source_language),
          definition: w.definition ?? local.definition,
          example: w.example ?? local.example,
        };
      });
    }
    assignmentSteps = material.supports.steps && summary.isAssignment ? summary.assignmentSteps : null;
  } catch {
    // Study aids are optional; the reading itself still ships. Fall back to local heuristics.
    if (material.supports.words) {
      wordPreview = candidates.map((word) => {
        const local = findDefinitionInText(word, sentences);
        return { word, syllables: syllabify(word, material.source_language), definition: local.definition, example: local.example };
      });
    }
  }

  const listenSeconds = Math.round((countWords(allText) / WORDS_PER_MINUTE) * 60);
  await updateMaterial(owner, materialId, { title, tldr, wordPreview, assignmentSteps, listenSeconds });
}

export function flaggedSummary(section: SectionRow): string | null {
  if (section.fact_guard.status !== "flagged") return null;
  const items = section.fact_guard.missing.flatMap((m) => m.items);
  return factGuardSummary(items.map((value) => ({ kind: "term", value, normalized: value.toLowerCase() })));
}
