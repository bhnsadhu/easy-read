import { LogoMark } from "@/components/ui/logo";
import { Reader } from "@/components/student/reader";
import { cachedPublicMaterial } from "@/lib/data/public-cached";

export const metadata = { robots: { index: false, follow: false } };

export default async function ReaderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const m = await cachedPublicMaterial(token);
  if (!m) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-(--container-form) flex-col items-start justify-center gap-3 px-4">
        <LogoMark size={40} />
        <h1 className="text-3xl font-bold">This link isn&apos;t active</h1>
        <p className="text-lg text-ink-muted">Ask your teacher for the new link.</p>
      </main>
    );
  }
  return <Reader material={m} />;
}
