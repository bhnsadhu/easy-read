"use client";

import { forwardRef, useId, useState, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { clsx } from "clsx";

export type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "role" | "type"> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  // lg gives a 44px hit area for student screens.
  size?: "md" | "lg";
};

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  {
    checked: checkedProp,
    defaultChecked = false,
    onCheckedChange,
    label,
    description,
    size = "md",
    id: idProp,
    className,
    onClick,
    disabled,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const descriptionId = `${id}-description`;
  const [internal, setInternal] = useState(defaultChecked);
  const checked = checkedProp ?? internal;
  const large = size === "lg";

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    const next = !checked;
    setInternal(next);
    onCheckedChange?.(next);
  };

  return (
    <div className={clsx("flex items-start gap-3", className)}>
      <button
        ref={ref}
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        onClick={toggle}
        className={clsx(
          // The ::before box extends the hit area to 36px (md) or 44px (lg) without changing the look.
          "relative inline-flex shrink-0 items-center rounded-full transition-colors duration-fast ease-brand before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-['']",
          large ? "mt-0.5 h-8 w-14" : "mt-0.5 h-6 w-11",
          checked ? "bg-accent" : "bg-border-strong",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
        {...rest}
      >
        <span
          aria-hidden="true"
          className={clsx(
            "absolute left-1 rounded-full bg-surface-raised transition-transform duration-fast ease-brand",
            large ? "size-6" : "size-4",
            checked && (large ? "translate-x-6" : "translate-x-5"),
          )}
        />
      </button>
      <label htmlFor={id} className={clsx("flex flex-col", disabled && "opacity-60")}>
        <span className={clsx("font-semibold text-ink", large ? "text-lg" : "text-base")}>{label}</span>
        {description && (
          <span id={descriptionId} className="text-sm text-ink-muted">
            {description}
          </span>
        )}
      </label>
    </div>
  );
});
