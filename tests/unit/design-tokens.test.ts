import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const TOKEN_FILE = path.join(ROOT, "src/styles/tokens.css");
const SCAN_DIRS = ["src", "emails", "supabase/templates"].map((d) => path.join(ROOT, d));
const SCAN_EXT = new Set([".ts", ".tsx", ".css", ".html", ".mdx", ".md", ".svg"]);
// Brand assets are generated from the mark and may carry literal colors.
const ALLOWED_RAW_COLOR_FILES = new Set([
  TOKEN_FILE,
  path.join(ROOT, "src/app/icon.svg"),
  path.join(ROOT, "src/app/opengraph-image.tsx"),
  path.join(ROOT, "src/app/manifest.ts"),
  path.join(ROOT, "src/lib/brand.ts"),
  path.join(ROOT, "supabase/templates/magic-link.html"),
]);

const HEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const RGB_HSL = /\b(?:rgba?|hsla?|oklch)\(/g;

// Deficit language is banned everywhere a human can read it (BRAND.md §10).
const BANNED_WORDS = [
  /\bstruggling\b/i,
  /\blow readers?\b/i,
  /\bremedial\b/i,
  /\bdeficit\b/i,
  /\bdisabled readers?\b/i,
  /\bdyslexia mode\b/i,
  /\bhallucinat(?:e|ion|ed|ing)s?\b/i,
  /\bAI-powered\b/i,
];

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, out);
    } else if (SCAN_EXT.has(path.extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

const files = SCAN_DIRS.flatMap((d) => walk(d));

describe("design tokens", () => {
  it("token file exists and defines the brand roles", () => {
    const css = readFileSync(TOKEN_FILE, "utf8");
    for (const v of ["--surface", "--ink", "--accent", "--highlight", "--highlight-bar", "--danger", "--warning", "--success"]) {
      expect(css, `missing ${v}`).toContain(`${v}:`);
    }
  });

  it("no raw colors outside the token file", () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (ALLOWED_RAW_COLOR_FILES.has(file)) continue;
      const text = readFileSync(file, "utf8");
      const lines = text.split("\n");
      lines.forEach((line, i) => {
        // Ignore URL fragments and import paths; only flag color literals.
        const stripped = line.replace(/https?:\/\/\S+/g, "").replace(/from\s+["'][^"']+["']/g, "");
        if (HEX.test(stripped) || RGB_HSL.test(stripped)) {
          offenders.push(`${path.relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
        }
        HEX.lastIndex = 0;
        RGB_HSL.lastIndex = 0;
      });
    }
    expect(offenders, `Raw colors found:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("no banned deficit language in anything a person reads", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      text.split("\n").forEach((line, i) => {
        for (const re of BANNED_WORDS) {
          if (re.test(line)) offenders.push(`${path.relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders, `Banned words found:\n${offenders.join("\n")}`).toEqual([]);
  });
});

describe("token contrast", () => {
  const css = readFileSync(TOKEN_FILE, "utf8");

  function block(selectorSource: string): Record<string, string> {
    const re = new RegExp(`${selectorSource}\\s*\\{([^}]*)\\}`);
    const m = css.match(re);
    if (!m) throw new Error(`block not found: ${selectorSource}`);
    const vars: Record<string, string> = {};
    for (const decl of m[1]!.split(";")) {
      const [k, v] = decl.split(":").map((s) => s.trim());
      if (k && v && k.startsWith("--")) vars[k] = v;
    }
    return vars;
  }

  function luminance(hex: string): number {
    const h = hex.replace("#", "");
    const [r, g, b] = [0, 2, 4].map((i) => {
      const c = parseInt(h.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrast(a: string, b: string): number {
    const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
    return (l1 + 0.05) / (l2 + 0.05);
  }

  const modes = [
    { name: "light", vars: block(":root,\\s*\\[data-theme=\"light\"\\]") },
    { name: "dark", vars: block("\\[data-theme=\"dark\"\\]") },
    { name: "reading cream", vars: { ...block(":root,\\s*\\[data-theme=\"light\"\\]"), ...block("\\[data-reading-bg=\"cream\"\\]") } },
    { name: "reading blue", vars: { ...block(":root,\\s*\\[data-theme=\"light\"\\]"), ...block("\\[data-reading-bg=\"blue\"\\]") } },
    { name: "reading green", vars: { ...block(":root,\\s*\\[data-theme=\"light\"\\]"), ...block("\\[data-reading-bg=\"green\"\\]") } },
    { name: "reading dark", vars: { ...block("\\[data-theme=\"dark\"\\]"), ...block("\\[data-reading-bg=\"dark\"\\]") } },
    { name: "reading contrast", vars: { ...block("\\[data-theme=\"dark\"\\]"), ...block("\\[data-reading-bg=\"contrast\"\\]") } },
  ];

  const TEXT_ON_SURFACE = ["--ink", "--ink-muted", "--ink-faint", "--accent", "--accent-strong", "--success", "--warning", "--danger"];

  for (const mode of modes) {
    describe(mode.name, () => {
      for (const surface of ["--surface", "--surface-raised", "--surface-sunken"]) {
        for (const text of TEXT_ON_SURFACE) {
          it(`${text} on ${surface} >= 4.5:1`, () => {
            expect(contrast(mode.vars[text]!, mode.vars[surface]!)).toBeGreaterThanOrEqual(4.5);
          });
        }
      }
      it("--on-accent on --accent >= 4.5:1", () => {
        expect(contrast(mode.vars["--on-accent"]!, mode.vars["--accent"]!)).toBeGreaterThanOrEqual(4.5);
      });
      it("--on-highlight on --highlight >= 4.5:1 (spoken sentence stays readable)", () => {
        expect(contrast(mode.vars["--on-highlight"]!, mode.vars["--highlight"]!)).toBeGreaterThanOrEqual(4.5);
      });
      it("--highlight-bar is a non-text indicator >= 3:1 on every surface (WCAG 1.4.11)", () => {
        for (const surface of ["--surface", "--surface-raised", "--surface-sunken"]) {
          expect(contrast(mode.vars["--highlight-bar"]!, mode.vars[surface]!), surface).toBeGreaterThanOrEqual(3);
        }
      });
      it("--ink on --accent-soft >= 4.5:1", () => {
        expect(contrast(mode.vars["--ink"]!, mode.vars["--accent-soft"]!)).toBeGreaterThanOrEqual(4.5);
      });
      it("status text on its soft background >= 4.5:1", () => {
        for (const s of ["success", "warning", "danger"]) {
          expect(contrast(mode.vars[`--${s}`]!, mode.vars[`--${s}-soft`]!), s).toBeGreaterThanOrEqual(4.5);
        }
      });
    });
  }

  it("every class theme accent is AA on cream with an AA label", () => {
    const light = block(":root,\\s*\\[data-theme=\"light\"\\]");
    const themes = [...css.matchAll(/\[data-class-theme="(\w+)"\]\s*\{([^}]*)\}/g)];
    expect(themes.length).toBe(6);
    for (const [, name, body] of themes) {
      const vars: Record<string, string> = {};
      for (const decl of body!.split(";")) {
        const [k, v] = decl.split(":").map((s) => s.trim());
        if (k && v) vars[k] = v;
      }
      expect(contrast(vars["--accent"]!, light["--surface"]!), `${name} accent on cream`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(vars["--on-accent"]!, vars["--accent"]!), `${name} label on accent`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(vars["--accent"]!, vars["--accent-soft"]!), `${name} accent on soft`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
