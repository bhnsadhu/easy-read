"use client";

import { useCallback, useEffect, useRef, type MouseEvent } from "react";

// Shared mechanics for Sheet and Dialog on the native <dialog> element:
// showModal/close in sync with `open`, body scroll lock, Escape via the native
// cancel flow, backdrop click, and focus returned to the opener on close.
export function useNativeDialog(open: boolean, onOpenChange: (open: boolean) => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }

    if (!dialog.open) {
      returnFocusTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    }

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousOverflow;
    };
  }, [open]);

  // Fires for Escape, backdrop click, and any dialog.close() call.
  const handleClose = useCallback(() => {
    onOpenChange(false);
    const target = returnFocusTo.current;
    returnFocusTo.current = null;
    if (target?.isConnected) target.focus();
  }, [onOpenChange]);

  // The dialog box has no padding, so a click on it (not a child) is a backdrop click.
  const handleBackdropClick = useCallback((event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  }, []);

  const close = useCallback(() => {
    ref.current?.close();
  }, []);

  return { ref, handleClose, handleBackdropClick, close };
}
