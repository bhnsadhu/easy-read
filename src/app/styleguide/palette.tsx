"use client";

import { useSyncExternalStore } from "react";

type Group = { title: string; tokens: string[] };

// Token names only. The values are read from the live stylesheet at runtime, so
// this file never contains a color literal.
const groups: Group[] = [
  { title: "Surfaces", tokens: ["--surface", "--surface-raised", "--surface-sunken"] },
  { title: "Lines", tokens: ["--border", "--border-strong"] },
  { title: "Text", tokens: ["--ink", "--ink-muted", "--ink-faint"] },
  { title: "Accent", tokens: ["--accent", "--accent-strong", "--accent-soft", "--on-accent"] },
  { title: "Highlight (spoken sentence only)", tokens: ["--highlight", "--highlight-bar", "--on-highlight"] },
  {
    title: "Status",
    tokens: ["--success", "--success-soft", "--warning", "--warning-soft", "--danger", "--danger-soft", "--on-danger"],
  },
];

const allTokens = groups.flatMap((group) => group.tokens);

type PaletteValues = Readonly<Record<string, string>>;

let cache: { key: string; values: PaletteValues } = { key: "", values: {} };
const emptyValues: PaletteValues = {};

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", callback);
  };
}

// Returns the same object while nothing changed so React can bail out.
function getSnapshot(): PaletteValues {
  const styles = getComputedStyle(document.documentElement);
  const values: Record<string, string> = {};
  const parts: string[] = [];
  for (const token of allTokens) {
    const value = styles.getPropertyValue(token).trim();
    values[token] = value;
    parts.push(value);
  }
  const key = parts.join("|");
  if (key !== cache.key) cache = { key, values };
  return cache.values;
}

function getServerSnapshot(): PaletteValues {
  return emptyValues;
}

export function PaletteSection() {
  const values = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-ink-muted">{group.title}</h3>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {group.tokens.map((token) => (
              <li key={token} className="flex flex-col gap-1.5">
                <div
                  aria-hidden="true"
                  className="h-14 rounded-md border border-border"
                  style={{ background: `var(${token})` }}
                />
                <code className="text-xs text-ink">{token}</code>
                <span className="tabular text-xs text-ink-muted">{values[token] ?? ""}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
