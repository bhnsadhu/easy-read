import type { HTMLAttributes } from "react";
import { clsx } from "clsx";

type VisuallyHiddenProps = HTMLAttributes<HTMLElement> & {
  as?: "span" | "div";
};

// Text for assistive technology only. Still read by screen readers, never seen.
export function VisuallyHidden({ as: Tag = "span", className, ...rest }: VisuallyHiddenProps) {
  return <Tag className={clsx("sr-only", className)} {...rest} />;
}
