"use client";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-(--container-form) flex-col items-start justify-center gap-4 px-4">
      <Logo size={28} href={null} />
      <h1 className="font-display text-3xl">Something went wrong on our side</h1>
      <p className="text-ink-muted">Nothing you did caused this. Try again in a moment.</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
