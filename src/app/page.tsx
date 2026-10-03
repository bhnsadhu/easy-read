import { SiteHeader } from "@/components/site-header";
import { BeforeAfter } from "@/components/before-after";
import { TryItForm } from "@/components/teacher/try-it-form";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-(--container-teacher) px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <section className="mb-10 flex flex-col gap-4">
          <h1 className="font-display text-5xl text-ink md:text-6xl">Dense readings, made readable.</h1>
          <p className="max-w-prose text-xl text-ink-muted">
            Teachers hand out readings that one in five students cannot get through. ReadEasy turns any reading into short sections, plain sentences, and big spaced text that reads itself aloud. Paste it, share one link, done.
          </p>
        </section>

        <BeforeAfter />

        <section aria-label="How it works" className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            ["1. Paste or upload", "Any reading, article, worksheet, or assignment. PDF, Word, photo, or text."],
            ["2. Check it", "See Before and After side by side. Fact Guard confirms no number, date, or name was lost."],
            ["3. Share one link", "Students open the class link. No accounts, no app, nothing to install."],
          ].map(([h, d]) => (
            <div key={h} className="rounded-lg border border-border bg-surface-raised p-4">
              <h2 className="text-lg font-bold">{h}</h2>
              <p className="mt-1 text-ink-muted">{d}</p>
            </div>
          ))}
        </section>

        <section id="try" className="mt-14 rounded-xl border border-border bg-surface-raised p-5 sm:p-6">
          <h2 className="mb-1 text-xl font-bold">Use your own material</h2>
          <p className="mb-4 text-sm text-ink-muted">Paste text or upload a PDF, Word file, or photo. No account needed to try it.</p>
          <TryItForm />
        </section>

        <p className="mt-10 text-center text-sm text-ink-muted">Built for students who find dense text hard to read, including the one in five with dyslexia. No student accounts, no tracking. <a href="/privacy" className="text-accent-strong underline underline-offset-4">How we handle privacy</a></p>
      </main>
    </>
  );
}
