import Link from "next/link";
import { LogoMark } from "@/components/ui/logo";
import { cachedPublicClass } from "@/lib/data/public-cached";

export const metadata = { robots: { index: false, follow: false } };

export default async function ClassPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const cls = await cachedPublicClass(handle);
  if (!cls) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-(--container-form) flex-col items-start justify-center gap-3 px-4">
        <LogoMark size={40} />
        <h1 className="text-3xl font-bold">This class link isn&apos;t active</h1>
        <p className="text-lg text-ink-muted">Ask your teacher for the new link.</p>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-(--container-teacher) px-4 py-10 sm:px-6" data-class-theme={cls.theme}>
      <header className="flex items-center gap-3">
        <LogoMark size={36} />
        <div>
          <h1 className="text-3xl font-bold">{cls.name}</h1>
          {cls.welcome && <p className="text-lg text-ink-muted">{cls.welcome}</p>}
        </div>
      </header>
      {cls.materials.length === 0 ? (
        <p className="mt-10 text-lg text-ink-muted">Nothing here yet. Check back soon.</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {cls.materials.map((m) => (
            <li key={m.token}>
              <Link href={`/r/${m.token}`} className="block rounded-xl border border-border bg-surface-raised p-5 transition-colors duration-fast hover:border-accent focus-visible:border-accent">
                <h2 className="text-xl font-bold">{m.title}</h2>
                <p className="mt-2 text-base text-ink-muted">{Math.max(1, Math.round(m.listen_seconds / 60))} min listen · {m.section_count} {m.section_count === 1 ? "part" : "parts"}</p>
                <span className="mt-4 inline-flex items-center rounded-full bg-accent px-4 py-2 text-base font-bold text-on-accent">Read</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
