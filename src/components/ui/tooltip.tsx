"use client";

import { cloneElement, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode } from "react";
import { clsx } from "clsx";

type TriggerProps = {
  "aria-describedby"?: string;
};

export type TooltipProps = {
  content: ReactNode;
  // One focusable element. It gets aria-describedby pointing at the tooltip.
  children: ReactElement<TriggerProps>;
  side?: "top" | "bottom";
  delay?: number;
  className?: string;
};

// Opens on hover and keyboard focus after a short delay, closes on Escape.
// The tooltip stays in the DOM so the description is always available; only opacity changes.
export function Tooltip({ content, children, side = "top", delay = 150, className }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const pending = timer;
    return () => {
      if (pending.current) clearTimeout(pending.current);
    };
  }, []);

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delay);
  };

  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "Escape") hide();
  };

  const describedBy = [children.props["aria-describedby"], id].filter(Boolean).join(" ");
  const trigger = cloneElement(children, { "aria-describedby": describedBy });

  return (
    <span
      className={clsx("relative inline-flex", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={handleKeyDown}
    >
      {trigger}
      <span
        role="tooltip"
        id={id}
        className={clsx(
          "pointer-events-none absolute left-1/2 z-50 w-max max-w-60 -translate-x-1/2 rounded-md bg-ink px-2.5 py-1.5 text-sm text-surface transition-opacity duration-fast ease-brand",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          open ? "opacity-100" : "opacity-0",
        )}
      >
        {content}
      </span>
    </span>
  );
}
