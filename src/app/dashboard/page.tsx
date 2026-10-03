import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getSession } from "@/lib/auth/session";
import { listClasses } from "@/lib/data/classes";
import { listMaterials } from "@/lib/data/materials";
import { publicEnv } from "@/lib/env";
import { TryItForm } from "@/components/teacher/try-it-form";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/auth/signin?next=/dashboard");
  const [classes, materials] = await Promise.all([listClasses(session.sub), listMaterials(session.sub)]);
  const base = publicEnv.NEXT_PUBLIC_APP_URL;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-(--container-teacher) px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl">Your classes</h1>
            <p className="text-ink-muted">Every published material lives on your class link.</p>
          </div>
        </div>
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-surface-raised p-4" data-class-theme={c.theme}>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-accent" aria-hidden />
                <h2 className="text-lg font-bold">{c.name}</h2>
              </div>
              <p className="mt-1 text-sm text-ink-muted">Grades {c.grade_band} · code <span className="tabular font-bold">{c.code}</span></p>
              <p className="mt-2 break-all text-sm"><Link href={`/c/${c.handle}`} className="text-accent-strong underline-offset-4 hover:underline">{base.replace(/^https?:\/\//, "")}/c/{c.handle}</Link></p>
              <div className="mt-3 flex gap-2">
                <ButtonLink href={`/c/${c.handle}`} size="sm" variant="secondary">Open class page</ButtonLink>
                <ButtonLink href={`/qr/${c.handle}`} size="sm" variant="ghost">QR</ButtonLink>
              </div>
            </div>
          ))}
          {classes.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3">
              <EmptyState title="No class yet" description="Make your first material. You&apos;ll create the class link when you publish." action={<ButtonLink href="#new">Add material</ButtonLink>} />
            </div>
          )}
        </section>

        <h2 className="mt-12 font-display text-3xl">Materials</h2>
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface-raised">
          {materials.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <Link href={`/materials/${m.id}/review`} className="font-bold hover:underline">{m.title}</Link>
                <p className="text-sm text-ink-muted">{m.section_count} sections · {Math.max(1, Math.round(m.listen_seconds / 60))} min listen{m.flagged_count ? ` · ${m.flagged_count} to check` : ""}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={m.status === "processing" ? "draft" : m.status} />
                {m.status === "published" && <ButtonLink href={`/r/${m.share_token}`} size="sm" variant="ghost">Student view</ButtonLink>}
              </div>
            </li>
          ))}
          {materials.length === 0 && <li className="px-4 py-6 text-ink-muted">Nothing yet. Paste your first reading below.</li>}
        </ul>

        <section id="new" className="mt-12 rounded-xl border border-border bg-surface-raised p-5">
          <h2 className="text-xl font-bold">New material</h2>
          <div className="mt-3"><TryItForm compact /></div>
        </section>
      </main>
    </>
  );
}
