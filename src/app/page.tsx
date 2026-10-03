import { Logo } from "@/components/ui/logo";
import { brand } from "@/lib/brand";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-(--container-teacher) flex-col items-start justify-center gap-6 px-4 py-16 sm:px-6 lg:px-8">
      <Logo size={40} />
      <h1 className="font-display text-5xl text-ink md:text-6xl">{brand.tagline}</h1>
      <p className="max-w-prose text-lg text-ink-muted">{brand.description}</p>
    </main>
  );
}
