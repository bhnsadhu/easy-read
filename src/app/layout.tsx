import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { fontVariables } from "./fonts";
import { brand } from "@/lib/brand";
import { ThemeScript } from "@/components/theme-script";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: brand.name, template: `%s · ${brand.name}` },
  description: brand.description,
  applicationName: brand.name,
  openGraph: { siteName: brand.name, type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <ThemeScript nonce={nonce} />
      </head>
      <body>{children}</body>
    </html>
  );
}
