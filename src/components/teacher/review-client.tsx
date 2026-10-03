"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { acknowledgeFactGuard, publishMaterial, unpublishMaterial, regenerateSection } from "@/lib/actions/materials";
import { createClassAction } from "@/lib/actions/classes";
import { normalizeHandle } from "@/lib/handles";
import type { FactGuardResult, SectionContent, WordPreviewEntry } from "@/lib/content/types";
import type { Supports } from "@/lib/data/types";
import { ContentView } from "@/components/student/content-view";

type Section = {
  id: string;
  position: number;
  status: string;
  title: string | null;
  about: string | null;
  original: SectionContent;
  levels: { medium?: SectionContent; simple?: SectionContent };
  factGuard: FactGuardResult;
  readability: { original?: number | null; medium?: number | null; simple?: number | null } | null;
  version: number;
  error: string | null;
};

type Props = {
  material: { id: string; title: string; status: string; version: number; classId: string | null; shareToken: string; tldr: string[] | null; wordPreview: WordPreviewEntry[] | null; supports: Supports };
  sections: Section[];
  signedIn: boolean;
  classes: { id: string; name: string; handle: string }[];
  appUrl: string;
};

type Level = "original" | "medium" | "simple";
const LEVEL_LABEL: Record<Level, string> = { original: "Original", medium: "Plain", simple: "Simple" };

export function ReviewClient({ material, sections, signedIn, classes, appUrl }: Props) {
  const router = useRouter();
  const [progress, setProgress] = useState<{ total: number; done: number; flagged: number; failed: number; status: string } | null>(null);
  const [level, setLevel] = useState<Level>("medium");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const processing = material.status === "processing";

  useEffect(() => {
    if (!processing) return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/materials/${material.id}/process`, { method: "POST" });
        const p = (await res.json()) as { total: number; done: number; flagged: number; failed: number; status: string };
        if (stop) return;
        setProgress(p);
        if (p.status === "processing") setTimeout(tick, 400);
        else router.refresh();
      } catch {
        if (!stop) setTimeout(tick, 1500);
      }
    };
    void tick();
    return () => {
      stop = true;
    };
  }, [processing, material.id, router]);

  const flagged = sections.filter((s) => s.status === "flagged" && !s.factGuard.acknowledged);
  const classHandle = classes.find((c) => c.id === material.classId)?.handle;
  const studentUrl = `${appUrl}/r/${material.shareToken}`;

  return (
    <main className="mx-auto max-w-(--container-teacher) px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted"><Link href="/dashboard" className="hover:underline">Dashboard</Link> / Review</p>
          <h1 className="font-display text-3xl">{material.title}</h1>
        </div>
        <StatusBadge status={material.status === "processing" ? "draft" : (material.status as "draft" | "needs_review" | "published")} />
      </div>

      {processing && (
        <section className="mt-6 rounded-lg border border-border bg-surface-raised p-4" aria-live="polite">
          <p className="font-bold">Adapting your material</p>
          <p className="text-sm text-ink-muted">Section by section. You can close this tab; it picks up where it left off.</p>
          <div className="mt-3">
            <Progress value={progress ? progress.done + progress.flagged + progress.failed : 0} max={progress?.total || sections.length || 1} label="Sections adapted" />
          </div>
        </section>
      )}

      {!processing && (
        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            {flagged.length > 0 && (
              <div className="rounded-lg border border-warning bg-warning-soft p-4 text-warning">
                <p className="font-bold">{flagged.length} {flagged.length === 1 ? "section needs" : "sections need"} a check before publishing</p>
                <p className="text-sm">Fact Guard found facts the rewrite dropped. Those levels show the original wording until you confirm.</p>
              </div>
            )}
            {material.tldr && material.tldr.length > 0 && (
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <h2 className="text-sm font-bold text-ink-muted">TL;DR</h2>
                <ul className="mt-1 list-disc pl-5">{material.tldr.map((t, i) => <li key={i}>{t}</li>)}</ul>
              </div>
            )}
            {material.wordPreview && material.wordPreview.length > 0 && (
              <div className="rounded-lg border border-border bg-surface-raised p-4">
                <h2 className="text-sm font-bold text-ink-muted">Words to know</h2>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {material.wordPreview.map((w) => (
                    <li key={w.word} className="rounded-md bg-surface-sunken px-2 py-1 text-sm"><span className="font-bold">{w.word}</span> <span className="text-ink-muted">{w.syllables.join("·")}</span>{w.definition ? "" : <span className="ml-1 text-warning">· teacher should define</span>}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-2" role="group" aria-label="Level to compare">
              {(["medium", "simple"] as Level[]).filter((l) => material.supports.levels.includes(l as "medium" | "simple")).map((l) => (
                <Button key={l} size="sm" variant={level === l ? "primary" : "secondary"} onClick={() => setLevel(l)}>{LEVEL_LABEL[l]}</Button>
              ))}
            </div>

            {sections.map((s) => {
              const adapted = s.levels[level as "medium" | "simple"];
              const needsAck = s.status === "flagged" && !s.factGuard.acknowledged;
              const dropped = s.factGuard.missing.flatMap((m) => m.items);
              return (
                <article key={s.id} className={`rounded-lg border bg-surface-raised p-4 ${needsAck ? "border-warning" : "border-border"}`}>
                  <header className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-bold">{s.position + 1}. {s.title ?? "Untitled"}</h2>
                    <div className="flex items-center gap-2">
                      {s.readability?.original != null && <Badge tone="neutral">Original ≈ grade {s.readability.original}</Badge>}
                      {s.readability?.[level as "medium" | "simple"] != null && <Badge tone="accent">{LEVEL_LABEL[level]} ≈ grade {s.readability[level as "medium" | "simple"]}</Badge>}
                      {s.status === "failed" && <Badge tone="danger">Could not adapt</Badge>}
                      {s.status === "flagged" && <Badge tone={s.factGuard.acknowledged ? "neutral" : "warning"} dot>{s.factGuard.acknowledged ? "Checked" : "Check facts"}</Badge>}
                    </div>
                  </header>
                  {s.about && <p className="mt-1 text-sm text-ink-muted">{s.about}</p>}
                  {s.status === "flagged" && (
                    <div className="mt-3 rounded-md bg-warning-soft p-3 text-sm text-warning">
                      <p className="font-bold">Fact Guard: {dropped.length} {dropped.length === 1 ? "fact was" : "facts were"} dropped in the {s.factGuard.missing.map((m) => LEVEL_LABEL[m.level]).join(" and ")} level: {dropped.join(", ")}.</p>
                      <p>We kept the original wording for that level. Confirm, or regenerate.</p>
                      {needsAck && (
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" loading={pending} onClick={() => start(async () => { const r = await acknowledgeFactGuard(material.id, s.id, s.version); if (!r.ok) setMessage(r.message); router.refresh(); })}>Keep original here</Button>
                          <Button size="sm" variant="secondary" loading={pending} onClick={() => start(async () => { const r = await regenerateSection(material.id, s.id); if (!r.ok) setMessage(r.message); router.refresh(); })}>Regenerate</Button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="mb-2 text-xs font-bold text-ink-muted">Original</h3>
                      <div className="rounded-md bg-surface p-3 text-base"><ContentView content={s.original} /></div>
                    </div>
                    <div>
                      <h3 className="mb-2 text-xs font-bold text-ink-muted">{LEVEL_LABEL[level]}</h3>
                      <div className="rounded-md bg-surface p-3 text-base">{adapted ? <ContentView content={adapted} /> : <p className="text-ink-faint">Not generated for this level.</p>}</div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
            <PublishPanel material={material} signedIn={signedIn} classes={classes} flaggedCount={flagged.length} classHandle={classHandle} studentUrl={studentUrl} appUrl={appUrl} onMessage={setMessage} />
            {message && <p className="rounded-md bg-danger-soft p-3 text-sm text-danger" role="alert">{message}</p>}
          </aside>
        </section>
      )}
    </main>
  );
}

function PublishPanel({ material, signedIn, classes, flaggedCount, classHandle, studentUrl, appUrl, onMessage }: {
  material: Props["material"]; signedIn: boolean; classes: Props["classes"]; flaggedCount: number; classHandle?: string; studentUrl: string; appUrl: string; onMessage: (m: string | null) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [className, setClassName] = useState("");
  const [handle, setHandle] = useState("");
  const [copied, setCopied] = useState(false);

  if (!signedIn) {
    return (
      <div className="rounded-lg border border-border bg-surface-raised p-4">
        <h2 className="text-lg font-bold">Ready to share?</h2>
        <p className="mt-1 text-sm text-ink-muted">Sign in to publish this to a class link. Your work here is kept.</p>
        <ButtonLink href={`/auth/signin?next=/materials/${material.id}/review`} className="mt-3" fullWidth>Sign in to publish</ButtonLink>
      </div>
    );
  }

  if (material.status === "published") {
    return (
      <div className="rounded-lg border border-success bg-success-soft p-4">
        <h2 className="text-lg font-bold text-success">Published</h2>
        <p className="mt-1 break-all text-sm"><a href={studentUrl} className="underline-offset-4 hover:underline">{studentUrl}</a></p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => { void navigator.clipboard.writeText(studentUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy link"}</Button>
          {classHandle && <ButtonLink size="sm" variant="secondary" href={`/qr/${classHandle}`}>QR for projector</ButtonLink>}
          {classHandle && <ButtonLink size="sm" variant="ghost" href={`/c/${classHandle}`}>Class page</ButtonLink>}
          <Button size="sm" variant="ghost" loading={pending} onClick={() => start(async () => { const r = await unpublishMaterial(material.id); if (!r.ok) onMessage(r.message); router.refresh(); })}>Unpublish</Button>
        </div>
      </div>
    );
  }

  const needsClass = classes.length === 0;
  return (
    <div className="rounded-lg border border-border bg-surface-raised p-4">
      <h2 className="text-lg font-bold">Publish to your class</h2>
      {needsClass ? (
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await createClassAction({ name: className, gradeBand: "6-8", handle: handle || normalizeHandle(className), theme: "teal" });
              if (!r.ok) return onMessage(r.message);
              onMessage(null);
              router.refresh();
            });
          }}
        >
          <p className="text-sm text-ink-muted">Create your class link first. Students bookmark this one link.</p>
          <Input placeholder="Ms. Rivera's 7th grade science" aria-label="Class name" required value={className} onChange={(e) => { setClassName(e.target.value); if (!handle) setHandle(""); }} />
          <div className="flex items-center gap-1 text-sm text-ink-muted"><span className="truncate">{appUrl.replace(/^https?:\/\//, "")}/c/</span><Input aria-label="Class link" placeholder={normalizeHandle(className) || "ms-rivera"} value={handle} onChange={(e) => setHandle(normalizeHandle(e.target.value))} className="min-w-0" /></div>
          <Button type="submit" loading={pending} disabled={!className.trim()}>Create class link</Button>
        </form>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-sm text-ink-muted">{classes.find((c) => c.id === material.classId)?.name ?? classes[0]!.name}</p>
          {flaggedCount > 0 && <p className="text-sm text-warning">Confirm {flaggedCount} flagged {flaggedCount === 1 ? "section" : "sections"} first.</p>}
          <Button
            loading={pending}
            disabled={flaggedCount > 0}
            onClick={() =>
              start(async () => {
                const { updateMaterialMeta } = await import("@/lib/actions/materials");
                if (!material.classId) {
                  const m = await updateMaterialMeta(material.id, { classId: classes[0]!.id });
                  if (!m.ok) return onMessage(m.message);
                }
                const r = await publishMaterial(material.id);
                if (!r.ok) return onMessage(r.message);
                onMessage(null);
                router.refresh();
              })
            }
          >
            Publish
          </Button>
        </div>
      )}
    </div>
  );
}
