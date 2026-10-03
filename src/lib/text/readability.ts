import rs from "text-readability";
import type { Readability, SectionContent } from "@/lib/content/types";
import { countWords } from "./sentences";

export function plainText(content: SectionContent | string): string {
  if (typeof content === "string") return content;
  return content.blocks
    .map((b) => {
      switch (b.type) {
        case "heading":
          return b.text;
        case "paragraph":
          return b.sentences.join(" ");
        case "list":
          return b.items.map((i) => i.join(" ")).join("\n");
        case "math":
          return b.text;
        case "table":
          return [b.header?.join(" "), ...b.rows.map((r) => r.join(" "))].filter(Boolean).join("\n");
        case "image":
          return b.alt;
      }
    })
    .join("\n\n");
}

export function estimateReadability(content: SectionContent | string): Readability {
  const text = plainText(content);
  const words = countWords(text);
  if (words < 100) return { grade: null, words };
  try {
    const g = rs.fleschKincaidGrade(text);
    return { grade: Math.round(Math.min(16, Math.max(0, g)) * 10) / 10, words };
  } catch {
    return { grade: null, words };
  }
}
