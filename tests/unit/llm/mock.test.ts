import { describe, expect, it } from "vitest";
import { MockProvider, rewriteContent, simplifySentence, definitionFromSentences } from "@/lib/llm/mock";
import { sectionResultSchema, materialResultSchema } from "@/lib/llm/types";
import { estimateReadability, plainText, verifyFacts } from "@/lib/text";
import type { SectionContent } from "@/lib/content/types";

const content: SectionContent = {
  blocks: [
    { type: "heading", level: 2, text: "Photosynthesis" },
    {
      type: "paragraph",
      sentences: [
        "In 1779, the Dutch scientist Jan Ingenhousz demonstrated that plants release oxygen only in light, and he utilized sealed jars to show it.",
        "Approximately 21% of the air is oxygen.",
        "Within the thylakoid membranes of the chloroplast is a light-absorbing pigment called chlorophyll, which is responsible for giving the plant its green color.",
        "A single large tree can produce 2,400 kilograms of oxygen in a year, which is enough for two people.",
      ],
    },
    { type: "math", text: "6CO2 + 6H2O → C6H12O6 + 6O2" },
  ],
};

describe("built-in adapter", () => {
  it("is deterministic and returns schema-valid section results", async () => {
    const p = new MockProvider();
    const task = { content, language: "en", gradeBand: "6-8" as const, levels: ["medium", "simple"] as const, wantQuickChecks: true };
    const a = await p.rewriteSection({ ...task, levels: [...task.levels] });
    const b = await p.rewriteSection({ ...task, levels: [...task.levels] });
    expect(a).toEqual(b);
    expect(sectionResultSchema.safeParse(a).success).toBe(true);
    expect(a.title).toBe("Photosynthesis");
    expect(a.quickChecks).toHaveLength(1);
    expect(new Set(a.quickChecks[0]!.options).size).toBe(3);
  });

  it("keeps math verbatim, swaps vocabulary, and keeps every fact", () => {
    const medium = rewriteContent(content, "medium");
    expect(medium.blocks.find((b) => b.type === "math")).toEqual({ type: "math", text: "6CO2 + 6H2O → C6H12O6 + 6O2" });
    const text = plainText(medium);
    expect(text).toContain("showed");
    expect(text).toContain("used");
    expect(text).toContain("About 21%");
    expect(text).toMatch(/gives the plant its green color/);
    for (const level of ["medium", "simple"] as const) {
      const { missing } = verifyFacts(plainText(content), plainText(rewriteContent(content, level)));
      expect(missing, `${level} dropped ${missing.map((f) => f.value).join(", ")}`).toEqual([]);
    }
  });

  it("makes sentences shorter at each level", () => {
    const original = content.blocks[1]!;
    const count = (c: SectionContent) => (c.blocks[1]!.type === "paragraph" ? c.blocks[1]!.sentences.length : 0);
    const avg = (c: SectionContent) => (c.blocks[1]!.type === "paragraph" ? c.blocks[1]!.sentences.reduce((a, s) => a + s.split(" ").length, 0) / c.blocks[1]!.sentences.length : 0);
    expect(original.type === "paragraph" && original.sentences.length).toBe(4);
    expect(count(rewriteContent(content, "medium"))).toBeGreaterThan(4);
    expect(count(rewriteContent(content, "simple"))).toBeGreaterThanOrEqual(count(rewriteContent(content, "medium")));
    expect(avg(rewriteContent(content, "simple"))).toBeLessThanOrEqual(avg(rewriteContent(content, "medium")));
  });

  it("splits relative and participial clauses into their own sentences", () => {
    expect(simplifySentence("Chlorophyll absorbs blue and red light, and reflects green light, making the plant appear green.", "simple")).toEqual([
      "Chlorophyll absorbs blue and red light.",
      "Then bounces back green light.",
      "This makes the plant appear green.",
    ]);
    expect(simplifySentence("The reaction needs sunlight, hence the name light-dependent reaction.", "medium")).toEqual([
      "The reaction needs sunlight, that is why it is called light-dependent reaction.",
    ]);
    for (const s of simplifySentence("The light-dependent reaction takes place within the thylakoid membrane and requires a steady stream of sunlight, which is converted into chemical energy in the form of the molecules ATP and NADPH.", "simple")) {
      expect(s).toMatch(/^[A-Z].*\.$/);
      expect(s.split(" ").length).toBeLessThanOrEqual(18);
    }
  });

  it("lowers the readability grade of a dense passage", () => {
    const dense: SectionContent = {
      blocks: [{ type: "paragraph", sentences: Array.from({ length: 8 }, () => "Within the thylakoid membranes of the chloroplast is a light-absorbing pigment called chlorophyll, which is responsible for giving the plant its green color, and during photosynthesis it absorbs energy from blue and red light waves while reflecting green light waves, making the plant appear green.") }],
    };
    const before = estimateReadability(dense).grade!;
    const after = estimateReadability(rewriteContent(dense, "simple")).grade!;
    expect(after).toBeLessThan(before - 3);
  });

  it("only defines words the text defines", () => {
    const sentences = ["Chlorophyll is the green pigment that captures light.", "Leaves hold chlorophyll."];
    expect(definitionFromSentences("chlorophyll", sentences).definition).toMatch(/green pigment/);
    expect(definitionFromSentences("oxygen", ["Plants release oxygen."]).definition).toBeNull();
  });

  it("summarizes a material without inventing", async () => {
    const p = new MockProvider();
    const r = await p.summarizeMaterial({
      title: "",
      language: "en",
      sections: [
        { title: "Photosynthesis", text: "Plants make food from light. Chlorophyll is the green pigment that captures light." },
        { title: "Task", text: "Answer the questions below.\n1. Name the pigment.\n2. Explain where oxygen comes from." },
      ],
      wordCandidates: [{ word: "chlorophyll", sentences: ["Chlorophyll is the green pigment that captures light."] }],
      wants: { tldr: true, words: true, steps: true },
    });
    expect(materialResultSchema.safeParse(r).success).toBe(true);
    expect(r.isAssignment).toBe(true);
    expect(r.assignmentSteps).toEqual(["Name the pigment.", "Explain where oxygen comes from."]);
    expect(r.words[0]!.definition).toMatch(/green pigment/);
  });

  it("supports injected failures for pipeline tests", async () => {
    const p = new MockProvider();
    p.failOnce("section", new Error("boom"));
    await expect(p.rewriteSection({ content, language: "en", gradeBand: null, levels: ["medium"], wantQuickChecks: false })).rejects.toThrow("boom");
  });
});
