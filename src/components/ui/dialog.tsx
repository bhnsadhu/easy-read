"use client";

import { useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "./button";
import { IconButton } from "./icon-button";
import { iconProps } from "./icon";
import { useNativeDialog } from "./use-native-dialog";

export type DialogSize = "sm" | "md" | "lg";

const sizes: Record<DialogSize, string> = {
  sm: "md:max-w-sm",
  md: "md:max-w-md",
  lg: "md:max-w-2xl",
};

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: DialogSize;
  // alertdialog for confirmations that interrupt the user.
  role?: "dialog" | "alertdialog";
  hideClose?: boolean;
  className?: string;
};

// Centered modal on the native <dialog>. Fades and rises 8px; opacity only under reduced motion.
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  role = "dialog",
  hideClose = false,
  className,
}: DialogProps) {
  const { ref, handleClose, handleBackdropClick, close } = useNativeDialog(open, onOpenChange);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <dialog
      ref={ref}
      role={role}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={handleClose}
      onClick={handleBackdropClick}
      className={clsx(
        "m-auto w-[calc(100%-2rem)] overflow-hidden rounded-xl border border-border bg-surface-raised p-0 text-ink shadow-float",
        sizes[size],
        "backdrop:bg-ink/40 backdrop:opacity-0 backdrop:transition-opacity backdrop:duration-slow backdrop:ease-brand open:backdrop:opacity-100 starting:open:backdrop:opacity-0",
        "opacity-0 transition-[translate,opacity,display,overlay] transition-discrete duration-slow ease-brand open:opacity-100 starting:open:opacity-0",
        "motion-safe:translate-y-2 motion-safe:open:translate-y-0 motion-safe:starting:open:translate-y-2",
        className,
      )}
    >
      <div className="flex max-h-[85dvh] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-3 px-5 pt-5 pb-2 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-base text-ink-muted">
                {description}
              </p>
            )}
          </div>
          {!hideClose && (
            <IconButton aria-label="Close" variant="ghost" size="md" className="-mt-1 -mr-2" onClick={close}>
              <X {...iconProps} />
            </IconButton>
          )}
        </header>
        {children && <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 sm:px-6">{children}</div>}
        {footer && (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 px-5 pt-2 pb-5 sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </dialog>
  );
}

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  // Destructive confirmations use the danger button.
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      role="alertdialog"
      size="sm"
      hideClose
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
