import { SiteHeader } from "@/components/site-header";
import { authMode } from "@/lib/env";
import { SignInForm } from "@/components/teacher/sign-in-form";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") ? sp.next : "/dashboard";
  const simple = authMode() === "simple";
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-(--container-form) px-4 py-16">
        <h1 className="font-display text-3xl">Sign in to publish</h1>
        <p className="mt-2 text-ink-muted">{simple ? "Enter your email. No password, no verification: your email is your account." : "We&apos;ll email you a link. No password."}</p>
        {sp.error === "expired" && <p className="mt-4 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">That link has expired or was already used. Request a new one.</p>}
        {sp.error === "email" && <p className="mt-4 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">That doesn&apos;t look like an email address. Check it and try again.</p>}
        <div className="mt-6">
          <SignInForm next={next} simple={simple} />
        </div>
      </main>
    </>
  );
}
