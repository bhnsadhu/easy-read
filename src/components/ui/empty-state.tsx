import type { ReactNode } from "react";
import Link from "next/link";
import { clsx } from "clsx";

export type EmptyStateProps = {
  // A lucide icon element; rendered in a soft accent disc.
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  // Every empty state has exactly one action (BRAND.md §10).
  action: ReactNode;
  secondary?: { label: string; href: string };
  headingAs?: "h2" | "h3";
  className?: string;
};

export function EmptyState({ icon, title, description, action, secondary, headingAs: Heading = "h3", className }: EmptyStateProps) {
  return (
    <section
      className={clsx(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface px-6 py-10 text-center",
        className,
      )}
    >
      {icon && (
        <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          {icon}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <Heading className="text-xl font-semibold text-ink">{title}</Heading>
        {description && <p className="max-w-sm text-base text-ink-muted">{description}</p>}
      </div>
      <div className="mt-1 flex flex-col items-center gap-3">
        {action}
        {secondary && (
          <Link
            href={secondary.href}
            className="rounded-sm text-sm font-semibold text-accent-strong transition-colors duration-fast ease-brand hover:text-accent"
          >
            {secondary.label}
          </Link>
        )}
      </div>
    </section>
  );
}
