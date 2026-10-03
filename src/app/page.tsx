import { SiteHeader } from "@/components/site-header";
import { TryItForm } from "@/components/teacher/try-it-form";
import { brand } from "@/lib/brand";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-(--container-teacher) px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <section className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-5xl text-ink md:text-6xl">{brand.tagline}</h1>
            <p className="max-w-prose text-lg text-ink-muted">
              Upload a reading. Share one link. Every student can read it, listen to it, and understand it, with the words lit up as they are read aloud.
            </p>
            <ul className="grid gap-3 text-base text-ink">
              <li className="flex gap-3"><span className="mt-2 h-2.5 w-7 shrink-0 rounded-full bg-highlight" />Read aloud with the current sentence highlighted</li>
              <li className="flex gap-3"><span className="mt-2 h-2.5 w-7 shrink-0 rounded-full bg-accent-soft" />Original, Plain, and Simple levels, one tap apart</li>
              <li className="flex gap-3"><span className="mt-2 h-2.5 w-7 shrink-0 rounded-full bg-accent-soft" />Fact Guard checks that no number, date, or name was dropped</li>
              <li className="flex gap-3"><span className="mt-2 h-2.5 w-7 shrink-0 rounded-full bg-accent-soft" />No student accounts, ever</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-surface-raised p-5 sm:p-6">
            <h2 className="mb-1 text-xl font-bold">Try it with your own material</h2>
            <p className="mb-4 text-sm text-ink-muted">Paste any text. You will see the full adapted version in seconds.</p>
            <TryItForm />
          </div>
        </section>
      </main>
    </>
  );
}
