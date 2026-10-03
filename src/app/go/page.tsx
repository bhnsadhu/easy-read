import { redirect } from "next/navigation";
import { LogoMark } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { cachedHandleByCode } from "@/lib/data/public-cached";

export const metadata = { robots: { index: false, follow: false } };

export default async function GoPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  let notFoundCode = false;
  if (code) {
    const handle = await cachedHandleByCode(code);
    if (handle) redirect(`/c/${handle}`);
    notFoundCode = true;
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-(--container-form) flex-col justify-center gap-4 px-4">
      <LogoMark size={40} />
      <h1 className="text-3xl font-bold">Enter your class code</h1>
      <form className="flex flex-col gap-3">
        <input name="code" defaultValue={code ?? ""} autoFocus autoComplete="off" spellCheck={false} maxLength={8} aria-label="Class code" className="h-14 rounded-md border border-border-strong bg-surface-raised px-4 text-2xl tracking-widest tabular" />
        {notFoundCode && <p className="text-danger" role="alert">We couldn&apos;t find that code. Check it with your teacher.</p>}
        <Button type="submit" size="lg">Go</Button>
      </form>
    </main>
  );
}
