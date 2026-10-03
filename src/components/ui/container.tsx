import type { HTMLAttributes } from "react";
import { clsx } from "clsx";

export type ContainerWidth = "teacher" | "form" | "reading";

const widths: Record<ContainerWidth, string> = {
  teacher: "max-w-(--container-teacher)",
  form: "max-w-(--container-form)",
  reading: "max-w-[65ch]",
};

type ContainerProps = HTMLAttributes<HTMLElement> & {
  width?: ContainerWidth;
  as?: "div" | "main" | "section" | "article";
};

// Centered content column with the brand gutters: 16px phone, 24px tablet, 32px desktop.
export function Container({ width = "teacher", as: Tag = "div", className, ...rest }: ContainerProps) {
  return <Tag className={clsx("mx-auto w-full px-4 sm:px-6 lg:px-8", widths[width], className)} {...rest} />;
}
