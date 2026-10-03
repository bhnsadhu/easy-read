import type { HTMLAttributes } from "react";
import { clsx } from "clsx";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

// Soft background with the tone's strong text; every pair is asserted >= 4.5:1.
const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-sunken text-ink-muted",
  accent: "bg-accent-soft text-accent-strong",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  dot?: boolean;
};

export function Badge({ tone = "neutral", dot = false, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {dot && <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export type MaterialStatus = "draft" | "needs_review" | "published";

// Status always carries a word, never color alone (BRAND.md §4).
const statuses: Record<MaterialStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  needs_review: { label: "Needs review", tone: "warning" },
  published: { label: "Published", tone: "success" },
};

export function StatusBadge({ status, className }: { status: MaterialStatus; className?: string }) {
  const { label, tone } = statuses[status];
  return (
    <Badge tone={tone} dot className={className}>
      {label}
    </Badge>
  );
}
