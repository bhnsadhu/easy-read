import { describe, expect, it } from "vitest";
import { chunkIntoSections, structureText, withoutTitleHeading } from "@/lib/text/chunk";
import { SAMPLES } from "@/lib/samples";

const headings = (blocks: { type: string; text?: string }[]) => blocks.filter((b) => b.type === "heading").map((b) => b.text);

// The heading that names a section is its title; it must not also appear in the body.
describe("section titles", () => {
  it.each(SAMPLES.map((s) => [s.id, s.text]))("%s: title is not repeated in the body", (_, text) => {
    for (const s of chunkIntoSections(structureText(text))) {
      expect(headings(s.original.blocks)).not.toContain(s.title);
    }
  });

  it("keeps headings that start later sections", () => {
    const filler = (n: number) => Array.from({ length: n }, (_, i) => `Sentence number ${i + 1} has a few plain words in it.`).join(" ");
    const sections = chunkIntoSections(structureText(`Rivers\n\n${filler(14)}\n\nLakes\n\n${filler(14)}`));
    expect(sections.map((s) => s.title)).toEqual(["Rivers", "Lakes"]);
    for (const s of sections) expect(s.original.blocks[0]?.type).toBe("paragraph");
  });

  it("drops a leading heading that matches the title, ignoring case and punctuation", () => {
    const content = { blocks: [{ type: "heading" as const, level: 2 as const, text: "The Dust Bowl." }, { type: "paragraph" as const, sentences: ["Dust."] }] };
    expect(withoutTitleHeading(content, "the dust bowl").blocks).toHaveLength(1);
    expect(withoutTitleHeading(content, "Black Sunday").blocks).toHaveLength(2);
  });

  it("keeps a heading that is the only block", () => {
    const content = { blocks: [{ type: "heading" as const, level: 2 as const, text: "Notes" }] };
    expect(withoutTitleHeading(content, "Notes").blocks).toHaveLength(1);
  });
});
