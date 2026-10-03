import type { SectionContent } from "@/lib/content/types";
import type { LlmProvider, MaterialResult, MaterialTask, RewriteLevel, SectionResult, SectionTask, VisionResult, VisionTask } from "./types";

// Built-in adapter: deterministic and rule-based (see src/lib/text/simplify.ts).
// Used when no API key is configured and in every test.
import { simplifyContent, simplifySentence } from "@/lib/text/simplify";

export { simplifySentence };

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function rewriteContent(content: SectionContent, level: RewriteLevel): SectionContent {
  return simplifyContent(content, level);
}

function firstSentence(content: SectionContent): string {
  for (const b of content.blocks) {
    if (b.type === "paragraph" && b.sentences[0]) return b.sentences[0];
    if (b.type === "list" && b.items[0]?.[0]) return b.items[0][0];
  }
  return "This part";
}

function titleFrom(content: SectionContent, given?: string): string {
  if (given?.trim()) return given.trim().slice(0, 120);
  const heading = content.blocks.find((b) => b.type === "heading");
  if (heading && heading.type === "heading") return heading.text.slice(0, 120);
  const words = firstSentence(content).replace(/[.!?]$/, "").split(/\s+/).slice(0, 7);
  return words.join(" ");
}

function aboutFrom(content: SectionContent): string {
  const s = firstSentence(content).replace(/[.!?]$/, "");
  const trimmed = s.split(/\s+/).slice(0, 14).join(" ");
  return `${trimmed}.`;
}

function perturb(sentence: string, variant: 1 | 2): string {
  const num = sentence.match(/\d+/);
  if (num) {
    const n = parseInt(num[0], 10);
    return sentence.replace(num[0], String(variant === 1 ? n + 1 : Math.max(0, n - 1)));
  }
  const words = sentence.split(" ");
  if (variant === 1) return words.length > 3 ? [...words.slice(0, 2), "not", ...words.slice(2)].join(" ") : `Not ${sentence}`;
  return words.length > 4 ? [...words.slice(0, -2), words.at(-1) ?? "", words.at(-2) ?? ""].join(" ") : `${sentence} again`;
}

function makeQuickChecks(content: SectionContent): SectionResult["quickChecks"] {
  const sentences = content.blocks.flatMap((b) => (b.type === "paragraph" ? b.sentences : b.type === "list" ? b.items.flat() : []));
  const pick = sentences.find((s) => /\d/.test(s) && s.split(" ").length <= 22) ?? sentences.find((s) => s.split(" ").length <= 22);
  if (!pick) return [];
  const correct = pick.replace(/[.!?]$/, "");
  return [
    {
      question: "Which of these is true, according to this part?",
      options: [correct, perturb(correct, 1), perturb(correct, 2)],
      answerIndex: 0,
    },
  ];
}

const DEFINITION_PATTERNS = (word: string) => [
  new RegExp(`\\b${word}\\b\\s+(?:is|are|was|were|means|refers to)\\s+(.+?)[.!?]$`, "i"),
  new RegExp(`\\b${word}\\b,\\s+(?:which|that)\\s+(?:is|are|means)\\s+(.+?)[,.!?]`, "i"),
  new RegExp(`\\b${word}\\b\\s*\\(([^)]{6,120})\\)`, "i"),
  new RegExp(`(?:called|known as|named)\\s+${word}\\b[^.]*`, "i"),
];

export function definitionFromSentences(word: string, sentences: string[]): { definition: string | null; example: string | null } {
  const example = sentences.find((s) => new RegExp(`\\b${word}\\b`, "i").test(s)) ?? null;
  for (const s of sentences) {
    for (const re of DEFINITION_PATTERNS(word)) {
      const m = s.match(re);
      if (m) {
        const def = (m[1] ?? s).trim().replace(/[.!?]$/, "");
        if (def.length >= 6) return { definition: capitalize(def).slice(0, 300), example: s };
      }
    }
  }
  return { definition: null, example };
}

export const MOCK_SCAN_TEXT = `## Photosynthesis: how plants make food

Plants make their own food using sunlight, water, and carbon dioxide. This process is called photosynthesis. It happens inside tiny structures called chloroplasts, which hold a green pigment called chlorophyll.

In 1779, the Dutch scientist Jan Ingenhousz showed that plants release oxygen only in light. Today we know that about 21% of the air we breathe is oxygen, and almost all of it comes from photosynthesis.

## Why it matters

A single large tree can make about 2,400 kilograms of oxygen in a year. Without photosynthesis, animals and people would have no food and no oxygen to breathe.

- Sunlight gives the energy.
- Water comes up from the roots.
- Carbon dioxide comes in through the leaves.`;

export class MockProvider implements LlmProvider {
  readonly name = "mock";
  private delayMs: number;
  private failNext: Partial<Record<"section" | "material" | "vision", Error>> = {};

  constructor(opts: { delayMs?: number } = {}) {
    this.delayMs = opts.delayMs ?? 0;
  }

  // Test hook: make the next call of a kind throw.
  failOnce(kind: "section" | "material" | "vision", err: Error) {
    this.failNext[kind] = err;
  }

  private async tick(kind: "section" | "material" | "vision") {
    if (this.delayMs) await new Promise((r) => setTimeout(r, this.delayMs));
    const err = this.failNext[kind];
    if (err) {
      delete this.failNext[kind];
      throw err;
    }
  }

  async rewriteSection(task: SectionTask): Promise<SectionResult> {
    await this.tick("section");
    const medium = task.levels.includes("medium") ? rewriteContent(task.content, "medium") : null;
    const simple = task.levels.includes("simple") ? rewriteContent(task.content, "simple") : null;
    return {
      title: titleFrom(task.content, task.title),
      about: aboutFrom(task.content),
      medium,
      simple,
      quickChecks: task.wantQuickChecks ? makeQuickChecks(task.content) : [],
    };
  }

  async summarizeMaterial(task: MaterialTask): Promise<MaterialResult> {
    await this.tick("material");
    const allText = task.sections.map((s) => s.text).join("\n");
    const isAssignment = /\b(answer the|complete the|write a|submit|due|turn in|fill in|instructions?:)\b/i.test(allText);
    const tldr = task.wants.tldr
      ? task.sections.slice(0, 3).map((s) => {
          // Skip heading-like lines (no sentence punctuation) and take the first real sentence.
          const line = s.text.split("\n").map((l) => l.trim()).find((l) => /[.!?]/.test(l)) ?? s.text;
          const first = line.split(/(?<=[.!?])\s+/)[0] ?? line;
          return first.split(/\s+/).slice(0, 18).join(" ").replace(/[,;:]$/, "").replace(/[.!?]?$/, ".");
        })
      : [];
    const words = task.wants.words
      ? task.wordCandidates.slice(0, 8).map((c) => ({ word: c.word, ...definitionFromSentences(c.word, c.sentences) }))
      : [];
    const assignmentSteps =
      task.wants.steps && isAssignment
        ? allText
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => /^(\d+[.)]|-|\*|•)\s+/.test(l))
            .map((l) => l.replace(/^(\d+[.)]|-|\*|•)\s+/, ""))
            .slice(0, 12)
        : [];
    return {
      title: task.title?.trim() || (task.sections[0]?.title ?? "Untitled"),
      isAssignment,
      tldr,
      words,
      assignmentSteps,
    };
  }

  async extractFromVision(task: VisionTask): Promise<VisionResult> {
    await this.tick("vision");
    return {
      text: MOCK_SCAN_TEXT,
      imageDescriptions: task.kind === "image" ? ["A worksheet page with a diagram of a leaf and arrows showing sunlight, water, and carbon dioxide."] : [],
      language: "en",
      warnings: [],
    };
  }
}
