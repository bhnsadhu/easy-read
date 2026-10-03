import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-(--container-form) flex-col items-start justify-center gap-4 px-4">
      <Logo size={28} />
      <h1 className="font-display text-3xl">That page isn&apos;t here</h1>
      <p className="text-ink-muted">If a teacher gave you this link, ask them for the new one.</p>
      <ButtonLink href="/">Go to the start</ButtonLink>
    </main>
  );
}
