import type { CSSProperties } from "react";
import { clsx } from "clsx";

type Dimension = number | string;

export type SkeletonProps = {
  variant?: "block" | "text" | "circle";
  // Exact size is reserved so content never shifts when it arrives.
  width?: Dimension;
  height?: Dimension;
  // Circle diameter.
  size?: Dimension;
  // Text variant: number of 24px lines (matches text-base line height).
  lines?: number;
  // Announced once to assistive technology. Pass null when a parent already announces.
  label?: string | null;
  className?: string;
};

// Pulses only when motion is allowed; static otherwise (BRAND.md §9).
const bar = "rounded-sm bg-border motion-safe:animate-pulse";

export function Skeleton({
  variant = "block",
  width,
  height,
  size,
  lines = 3,
  label = "Loading",
  className,
}: SkeletonProps) {
  const announce = label ? <span className="sr-only">{label}</span> : null;

  if (variant === "text") {
    return (
      <div role={label ? "status" : undefined} className={clsx("flex flex-col", className)} style={{ width }}>
        {Array.from({ length: lines }, (_, index) => (
          <div key={index} className="flex h-6 items-center">
            <div className={clsx(bar, "h-4", index === lines - 1 && lines > 1 ? "w-3/5" : "w-full")} />
          </div>
        ))}
        {announce}
      </div>
    );
  }

  const style: CSSProperties =
    variant === "circle" ? { width: size ?? 40, height: size ?? 40 } : { width: width ?? "100%", height: height ?? 16 };

  return (
    <div
      role={label ? "status" : undefined}
      className={clsx(bar, variant === "circle" && "rounded-full", className)}
      style={style}
    >
      {announce}
    </div>
  );
}
