// Ambient types for untyped vendor packages used inside src/lib/text only.

declare module "hyphen/hyphen" {
  export interface HyphenatorOptions {
    hyphenChar?: string;
    minWordLength?: number;
    exceptions?: string[];
    html?: boolean;
    async?: boolean;
  }
  export type Hyphenator = (text: string, options?: HyphenatorOptions) => string;
  export default function createHyphenator(patterns: unknown, options?: HyphenatorOptions): Hyphenator;
}

declare module "hyphen/patterns/en-us" {
  const patterns: unknown;
  export default patterns;
}

declare module "text-readability" {
  interface Readability {
    fleschKincaidGrade(text: string): number;
    fleschReadingEase(text: string): number;
    lexiconCount(text: string, removePunctuation?: boolean): number;
    sentenceCount(text: string): number;
    syllableCount(text: string, lang?: string): number;
  }
  const readability: Readability;
  export default readability;
}
