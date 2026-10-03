import type { QuickCheck, SectionContent } from "@/lib/content/types";
import { QUIZ_STOPWORDS, stem, tokenize } from "./match";
import { plainText } from "./readability";

function contentWords(s: string): string[] {
  return tokenize(s.toLowerCase()).filter((w) => w.length >= 4 && !QUIZ_STOPWORDS.has(w)).map(stem);
}

function coverage(words: string[], pool: Set<string>): number {
  if (!words.length) return 1;
  return words.filter((w) => pool.has(w)).length / words.length;
}

export function validateQuickCheck(section: SectionContent, qc: Omit<QuickCheck, "supported">): QuickCheck {
  const pool = new Set(contentWords(plainText(section)));
  const answer = qc.options[qc.answerIndex];
  const distinct = new Set(qc.options.map((o) => o.trim().toLowerCase())).size === qc.options.length;
  const supported = Boolean(answer) && distinct && coverage(contentWords(answer!), pool) >= 0.6 && coverage(contentWords(qc.question), pool) >= 0.5;
  return { ...qc, supported };
}
