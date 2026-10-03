import Link from "next/link";
import { clsx } from "clsx";

type LogoProps = {
  size?: number;
  wordmark?: boolean;
  href?: string | null;
  className?: string;
};

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={clsx("shrink-0", className)}
    >
      <rect width="64" height="64" rx="14" className="fill-accent" />
      <rect x="14" y="17" width="28" height="6" rx="3" className="fill-surface" />
      <rect x="14" y="28" width="36" height="9" rx="4.5" className="fill-highlight" />
      <rect x="14" y="42" width="22" height="6" rx="3" className="fill-surface" />
    </svg>
  );
}

export function Logo({ size = 32, wordmark = true, href = "/", className }: LogoProps) {
  const content = (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      {wordmark && (
        <span
          className="font-display text-ink"
          style={{ fontSize: size * 0.78, lineHeight: 1 }}
        >
          ReadEasy
        </span>
      )}
    </span>
  );
  if (href === null) return content;
  return (
    <Link href={href} aria-label="ReadEasy home" className="rounded-md">
      {content}
    </Link>
  );
}
