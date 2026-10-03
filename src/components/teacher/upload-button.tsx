"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type Extracted = { text: string; title: string | null; warnings: string[]; pii: { findings: unknown[]; summary: string } };

// Uploads a file (PDF, Word, image, text), extracts its text on the server,
// and hands it back to the paste box so the teacher can see and edit it first.
export function UploadButton({ onExtracted, onError }: { onExtracted: (e: Extracted) => void; onError: (m: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handle(file: File) {
    setBusy(true);
    onError(null);
    try {
      const prep = await fetch("/api/uploads/prepare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: file.name, mime: file.type, size: file.size }) });
      const p = (await prep.json()) as { uploadId?: string; mode?: "signed" | "direct"; url?: string; signedUrl?: string; token?: string; path?: string; error?: { message: string } };
      if (!prep.ok || !p.uploadId) throw new Error(p.error?.message ?? "We couldn't start the upload. Try again.");
      if (p.mode === "direct" && p.url) {
        const put = await fetch(p.url, { method: "PUT", body: file });
        if (!put.ok) throw new Error("The upload didn't finish. Try again.");
      } else if (p.signedUrl) {
        const put = await fetch(p.signedUrl, { method: "PUT", body: file, headers: { "content-type": file.type || "application/octet-stream", "x-upsert": "true" } });
        if (!put.ok) throw new Error("The upload didn't finish. Try again.");
      }
      const res = await fetch("/api/ingest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "upload", uploadId: p.uploadId, name: file.name, mime: file.type }) });
      const data = (await res.json()) as Extracted & { error?: { message: string } };
      if (!res.ok) throw new Error(data.error?.message ?? "We couldn't read that file. Try a clearer copy, or paste the text.");
      onExtracted(data);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <input ref={input} type="file" accept=".pdf,.docx,.txt,.md,image/*" className="sr-only" aria-label="Choose a file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handle(f); }} />
      <Button type="button" variant="secondary" loading={busy} icon={<Upload size={18} strokeWidth={1.75} />} onClick={() => input.current?.click()}>
        Upload a file
      </Button>
    </>
  );
}
