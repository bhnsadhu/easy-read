"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestMagicLink } from "@/lib/actions/auth";

export function SignInForm({ next, simple }: { next: string; simple: boolean }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (simple) {
    return (
      <form action="/api/auth/simple" method="post" className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <Input name="email" type="email" required placeholder="you@school.org" aria-label="Email" autoComplete="email" />
        <Button type="submit" size="lg">Sign in</Button>
      </form>
    );
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-border bg-surface-raised p-4">
        <p className="font-bold">Check your email</p>
        <p className="mt-1 text-ink-muted">We sent a sign-in link to {email}. It works once and expires in an hour.</p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const r = await requestMagicLink(email, next);
        setBusy(false);
        if (r.ok) setSent(true);
        else setError(r.message);
      }}
    >
      <Input type="email" required placeholder="you@school.org" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <Button type="submit" size="lg" loading={busy}>Email me a link</Button>
    </form>
  );
}
