import { forwardRef, type HTMLAttributes } from "react";
import { clsx } from "clsx";

export type CardPadding = "none" | "sm" | "md" | "lg";

const paddings: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-6 sm:p-8",
};

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: CardPadding;
};

// Cards have a border, never a shadow (BRAND.md §7).
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padding = "md", className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={clsx("rounded-lg border border-border bg-surface-raised text-ink", paddings[padding], className)}
      {...rest}
    />
  );
});

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("mb-3 flex items-start justify-between gap-3", className)} {...rest} />;
}

type CardTitleProps = HTMLAttributes<HTMLHeadingElement> & {
  as?: "h2" | "h3" | "h4";
};

export function CardTitle({ as: Tag = "h3", className, ...rest }: CardTitleProps) {
  return <Tag className={clsx("text-xl font-semibold text-ink", className)} {...rest} />;
}

export function CardDescription({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={clsx("mt-1 text-sm text-ink-muted", className)} {...rest} />;
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("text-base text-ink", className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4", className)}
      {...rest}
    />
  );
}
