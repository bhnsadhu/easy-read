"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { clsx } from "clsx";
import { iconPropsSmall } from "@/components/ui/icon";

const STORAGE_KEY = "readeasy:theme";

export type ThemeChoice = "light" | "dark" | "system";

// Subscribes to the data-theme attribute and the OS preference, so the toggle
// reflects what the root element shows, even when the theme script set it.
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

function getSnapshot(): ThemeChoice {
  const theme = document.documentElement.dataset.theme;
  return theme === "light" || theme === "dark" ? theme : "system";
}

function getServerSnapshot(): ThemeChoice {
  return "system";
}

export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = choice;
  }
  try {
    if (choice === "system") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, choice);
    }
  } catch {
    // Storage can be unavailable (private mode). The attribute still applies for this visit.
  }
}

const options: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle() {
  const current = useThemeChoice();

  return (
    <div role="group" aria-label="Theme" className="inline-flex rounded-md border border-border-strong bg-surface-raised p-0.5">
      {options.map(({ value, label, icon: Icon }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => applyTheme(value)}
            className={clsx(
              "inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-sm font-semibold transition-colors duration-fast ease-brand",
              active ? "bg-accent-soft text-accent-strong" : "text-ink-muted hover:text-ink",
            )}
          >
            <Icon {...iconPropsSmall} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
