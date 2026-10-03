"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { UploadButton } from "./upload-button";

const SAMPLE = `Photosynthesis: how plants make food

Plants make their own food using sunlight, water, and carbon dioxide. This process is called photosynthesis. It happens inside tiny structures called chloroplasts, which hold a green pigment called chlorophyll.

In 1779, the Dutch scientist Jan Ingenhousz demonstrated that plants release oxygen only in light. Today we know that approximately 21% of the air we breathe is oxygen, and almost all of it comes from photosynthesis.

Why it matters

A single large tree can produce approximately 2,400 kilograms of oxygen in a year, which is enough for two people. Without photosynthesis, animals and people would have no food and no oxygen to breathe, and the planet would look very different.

The three ingredients

- Sunlight gives the energy.
- Water comes up from the roots.
- Carbon dioxide comes in through the leaves.`;

export function TryItForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, title: title || undefined, sourceType: "paste", piiAcknowledged: true, allowDuplicate: true }),
      });
      const data = (await res.json()) as { id?: string; error?: { message: string } };
      if (!res.ok || !data.id) throw new Error(data.error?.message ?? "Something went wrong. Try again.");
      router.push(`/materials/${data.id}/review`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {!compact && (
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          aria-label="Title"
          className="h-11 rounded-md border border-border-strong bg-surface-raised px-3 text-base"
        />
      )}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste a reading, article, worksheet, or assignment here."
        aria-label="Material text"
        rows={compact ? 6 : 10}
        required
        minLength={40}
      />
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {notes.length > 0 && (
        <ul className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning" role="status">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" loading={busy} disabled={text.trim().length < 40}>
          Make it readable
        </Button>
        <UploadButton
          onError={setError}
          onExtracted={(e) => {
            setText(e.text);
            if (e.title && !title) setTitle(e.title);
            const n = [...e.warnings];
            if (e.pii.findings.length) n.push(`${e.pii.summary} Check the text before you continue; names and contact details were kept so you can remove them.`);
            setNotes(n);
          }}
        />
        <Button type="button" variant="ghost" onClick={() => setText(SAMPLE)}>
          Use a sample reading
        </Button>
        <span className="text-sm text-ink-faint">No account needed to try it.</span>
      </div>
    </form>
  );
}
