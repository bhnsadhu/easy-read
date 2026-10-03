import { describe, expect, it } from "vitest";
import { MockProvider, dropFirstYear, rewriteContent, simplifySentence, definitionFromSentences } from "@/lib/llm/mock";
import { sectionResultSchema, materialResultSchema } from "@/lib/llm/types";
import type { SectionContent } from "@/lib/content/types";

const content: SectionContent = {
  blocks: [
    { type: "heading", level: 2, text: "Photosynthesis" },
    {
      type: "paragraph",
      sentences: [
        "In 1779, the Dutch scientist Jan Ingenhousz demonstrated that plants release oxygen only in light, and he utilized sealed jars to show it.",
        "Approximately 21% of the air is oxygen.",
        "A single large tree can produce 2,400 kilograms of oxygen in a year, which is enough for two people.",
      ],
    },
    { type: "math", text: "6CO2 + 6H2O → C6H12O6 + 6O2" },
  ],
};

describe("mock provider", () => {
  it("is deterministic and returns schema-valid section results", async () => {
    const p = new MockProvider();
    const task = { content, language: "en", gradeBand: "6-8" as const, levels: ["medium", "simple"] as const, wantQuickChecks: true };
    const a = await p.rewriteSection({ ...task, levels: [...task.levels] });
    const b = await p.rewriteSection({ ...task, levels: [...task.levels] });
    expect(a).toEqual(b);
    expect(sectionResultSchema.safeParse(a).success).toBe(true);
    expect(a.title).toBe("Photosynthesis");
    expect(a.quickChecks).toHaveLength(1);
    expect(a.quickChecks[0]!.options[a.quickChecks[0]!.answerIndex]).toContain("21%");
    expect(new Set(a.quickChecks[0]!.options).size).toBe(3);
  });

  it("keeps math verbatim and simplifies vocabulary", () => {
    const medium = rewriteContent(content, "medium");
    const math = medium.blocks.find((b) => b.type === "math");
    expect(math).toEqual({ type: "math", text: "6CO2 + 6H2O → C6H12O6 + 6O2" });
    const text = JSON.stringify(medium);
    expect(text).toContain("showed");
    expect(text).toContain("used");
    expect(text).toContain("about 21%");
    expect(text).toContain("1779");
    expect(text).toContain("2,400");
  });

  it("drops the first year in the simple level (so Fact Guard has something to catch)", () => {
    const simple = rewriteContent(content, "simple");
    const text = JSON.stringify(simple);
    expect(text).not.toContain("1779");
    expect(text).toContain("Jan Ingenhousz");
    expect(text).toContain("21%");
  });

  it("restores the facts on a Fact Guard retry", async () => {
    const p = new MockProvider();
    const r = await p.rewriteSection({ content, language: "en", gradeBand: null, levels: ["simple"], wantQuickChecks: false, missing: { simple: ["1779"] } });
    expect(JSON.stringify(r.simple)).toContain("1779");
  });

  it("splits long compound sentences", () => {
    const out = simplifySentence("The roots take in water from the soil, and the leaves take in carbon dioxide from the air, which the plant uses to make sugar.", "medium");
    expect(out.length).toBeGreaterThanOrEqual(2);
    for (const s of out) expect(s).toMatch(/^[A-Z].*\.$/);
  });

  it("dropFirstYear handles leading and trailing placements", () => {
    expect(dropFirstYear(["In 1779, he did it."]).sentences).toEqual(["He did it."]);
    expect(dropFirstYear(["He did it in 1779."]).sentences).toEqual(["He did it."]);
    expect(dropFirstYear(["Nothing here."]).dropped).toBeNull();
  });

  it("only defines words the text defines", () => {
    const sentences = ["Chlorophyll is the green pigment that captures light.", "Leaves hold chlorophyll."];
    expect(definitionFromSentences("chlorophyll", sentences).definition).toMatch(/green pigment/);
    expect(definitionFromSentences("oxygen", ["Plants release oxygen."]).definition).toBeNull();
    expect(definitionFromSentences("oxygen", ["Plants release oxygen."]).example).toBe("Plants release oxygen.");
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
    expect(r.tldr.length).toBeGreaterThan(0);
  });

  it("supports injected failures for pipeline tests", async () => {
    const p = new MockProvider();
    p.failOnce("section", new Error("boom"));
    await expect(p.rewriteSection({ content, language: "en", gradeBand: null, levels: ["medium"], wantQuickChecks: false })).rejects.toThrow("boom");
    await expect(p.rewriteSection({ content, language: "en", gradeBand: null, levels: ["medium"], wantQuickChecks: false })).resolves.toBeTruthy();
  });
});
