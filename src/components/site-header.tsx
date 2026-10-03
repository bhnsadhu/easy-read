import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";

export async function SiteHeader() {
  const session = await getSession();
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-(--container-teacher) items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo size={28} />
        <nav className="flex items-center gap-2">
          {session ? (
            <>
              <ButtonLink href="/dashboard" variant="ghost" size="sm">Dashboard</ButtonLink>
              <form action="/auth/signout" method="post">
                <button type="submit" className="rounded-md px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-sunken">Sign out</button>
              </form>
            </>
          ) : (
            <ButtonLink href="/auth/signin" variant="secondary" size="sm">Sign in</ButtonLink>
          )}
        </nav>
      </div>
    </header>
  );
}
