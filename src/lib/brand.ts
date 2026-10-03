// Literal brand values for places that cannot read CSS variables
// (PWA manifest, OG image generation, email templates). Keep in sync with
// src/styles/tokens.css; the token test allows raw colors in this file only.
export const brand = {
  name: "ReadEasy",
  tagline: "Every reading, ready for every reader.",
  description:
    "Upload a reading. Share one link. Every student can read it, listen to it, and understand it.",
  colors: {
    surface: "#FBF7EF",
    ink: "#2B2620",
    inkMuted: "#5F574D",
    accent: "#0E6F63",
    highlight: "#FFE66D",
    dark: "#1B1A18",
    transparent: "#00000000",
  },
} as const;

export const classThemes = ["teal", "plum", "rust", "indigo", "forest", "berry"] as const;
export type ClassTheme = (typeof classThemes)[number];
