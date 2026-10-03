import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StyleguideClient } from "./styleguide-client";

export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

// Dev-only. Hidden unless NEXT_PUBLIC_DEV_TOOLS=1 (see .env.example).
export default function StyleguidePage() {
  if (process.env.NEXT_PUBLIC_DEV_TOOLS !== "1") notFound();
  return <StyleguideClient />;
}
