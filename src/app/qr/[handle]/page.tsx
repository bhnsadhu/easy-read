import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { LogoMark } from "@/components/ui/logo";
import { cachedPublicClass } from "@/lib/data/public-cached";
import { publicEnv } from "@/lib/env";
import { brand } from "@/lib/brand";

export const metadata = { robots: { index: false, follow: false } };

export default async function QrPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const cls = await cachedPublicClass(handle);
  if (!cls) notFound();
  const url = `${publicEnv.NEXT_PUBLIC_APP_URL}/c/${cls.handle}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: brand.colors.ink, light: brand.colors.transparent } });
  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <div className="flex items-center gap-3"><LogoMark size={40} /><span className="font-display text-3xl">ReadEasy</span></div>
      <h1 className="text-4xl font-bold">{cls.name}</h1>
      <div className="w-[min(70vmin,480px)] rounded-xl border border-border bg-surface-raised p-6" dangerouslySetInnerHTML={{ __html: svg }} aria-label={`QR code for ${url}`} role="img" />
      <p className="text-3xl font-bold">{url.replace(/^https?:\/\//, "")}</p>
      <p className="text-2xl text-ink-muted">or go to <span className="font-bold text-ink">{publicEnv.NEXT_PUBLIC_APP_URL.replace(/^https?:\/\//, "")}/go</span> and enter code <span className="tabular font-bold text-ink">{cls.code}</span></p>
    </main>
  );
}
