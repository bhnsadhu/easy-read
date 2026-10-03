import { Atkinson_Hyperlegible_Next, Fraunces, Lexend } from "next/font/google";
import localFont from "next/font/local";

export const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin", "latin-ext"],
  variable: "--font-atkinson",
  display: "swap",
  // next/font has no metric overrides for this family yet; avoids a dev warning.
  adjustFontFallback: false,
});

export const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
  preload: false,
});

export const lexend = Lexend({
  subsets: ["latin", "latin-ext"],
  variable: "--font-lexend",
  display: "swap",
  preload: false,
});

export const openDyslexic = localFont({
  src: [
    { path: "../fonts/OpenDyslexic-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/OpenDyslexic-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-opendyslexic",
  display: "swap",
  preload: false,
  adjustFontFallback: "Arial",
});

export const fontVariables = [atkinson.variable, fraunces.variable, lexend.variable, openDyslexic.variable].join(" ");
