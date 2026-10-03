"use client";

import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";
import { IconButton } from "./icon-button";
import { iconProps } from "./icon";
import { useNativeDialog } from "./use-native-dialog";

export type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Required: names the sheet for assistive technology via aria-labelledby.
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

// Bottom sheet on phones, centered modal from the md breakpoint up. Slides up
// over duration-slow with the brand ease; opacity only under reduced motion.
export function Sheet({ open, onOpenChange, title, description, children, footer, className }: SheetProps) {
  const { ref, handleClose, handleBackdropClick, close } = useNativeDialog(open, onOpenChange);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={handleClose}
      onClick={handleBackdropClick}
      className={clsx(
        "mx-0 mt-auto mb-0 w-full max-w-full overflow-hidden rounded-t-xl border border-border bg-surface-raised p-0 text-ink shadow-float",
        "md:m-auto md:max-w-lg md:rounded-xl",
        "backdrop:bg-ink/40 backdrop:opacity-0 backdrop:transition-opacity backdrop:duration-slow backdrop:ease-brand open:backdrop:opacity-100 starting:open:backdrop:opacity-0",
        "opacity-0 transition-[translate,opacity,display,overlay] transition-discrete duration-slow ease-brand open:opacity-100 starting:open:opacity-0",
        "motion-safe:translate-y-full motion-safe:open:translate-y-0 motion-safe:starting:open:translate-y-full",
        "motion-safe:md:translate-y-4 motion-safe:md:open:translate-y-0 motion-safe:md:starting:open:translate-y-4",
        className,
      )}
    >
      <div className="flex max-h-[85dvh] flex-col md:max-h-[80dvh]">
        <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border-strong md:hidden" />
        <header className="flex shrink-0 items-start justify-between gap-3 px-4 pt-3 pb-2 sm:px-6 md:pt-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-ink-muted">
                {description}
              </p>
            )}
          </div>
          <IconButton aria-label="Close" variant="ghost" size="md" className="-mt-1 -mr-2" onClick={close}>
            <X {...iconProps} />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6">{children}</div>
        {footer && (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </dialog>
  );
}
