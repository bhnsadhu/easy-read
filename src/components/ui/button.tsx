import { forwardRef, type ButtonHTMLAttributes, type ComponentPropsWithoutRef, type ReactNode } from "react";
import Link from "next/link";
import { clsx } from "clsx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap select-none transition-colors duration-fast ease-brand disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-strong",
  secondary: "border border-border-strong bg-surface-raised text-ink hover:bg-surface-sunken",
  ghost: "bg-transparent text-ink hover:bg-surface-sunken",
  danger: "bg-danger text-on-danger hover:bg-danger/90",
};

// 36px targets on the teacher side, 44px on student screens (BRAND.md §6).
const sizes: Record<ButtonSize, string> = {
  sm: "h-8 min-w-8 px-3 text-sm",
  md: "h-9 min-w-9 px-4 text-base",
  lg: "h-11 min-w-11 px-5 text-base",
};

const squareSizes: Record<ButtonSize, string> = {
  sm: "size-8",
  md: "size-9",
  lg: "size-11",
};

export type ButtonStyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  square = false,
  className,
}: ButtonStyleProps & { square?: boolean; className?: string }) {
  return clsx(
    base,
    variants[variant],
    square ? squareSizes[size] : sizes[size],
    fullWidth && "w-full",
    className,
  );
}

// CSS-only spinner. Under reduced motion it stays as a static ring with a gap;
// the surrounding aria-busy and "Loading" text still convey the state.
export function Spinner({ className, size = "md" }: { className?: string; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none",
        size === "sm" ? "size-3.5" : "size-4",
        className,
      )}
    />
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonStyleProps & {
    loading?: boolean;
    icon?: ReactNode;
    iconTrailing?: ReactNode;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    fullWidth,
    loading = false,
    icon,
    iconTrailing,
    className,
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading ? <Spinner size={size === "sm" ? "sm" : "md"} /> : icon}
      {children}
      {iconTrailing}
      {loading && <span className="sr-only">Loading</span>}
    </button>
  );
});

export type ButtonLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, "className"> &
  ButtonStyleProps & {
    className?: string;
    disabled?: boolean;
    icon?: ReactNode;
    iconTrailing?: ReactNode;
  };

// A link that looks like a button. Use it for navigation; use Button for actions.
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant = "primary", size = "md", fullWidth, disabled, icon, iconTrailing, className, children, ...rest },
  ref,
) {
  return (
    <Link
      ref={ref}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {icon}
      {children}
      {iconTrailing}
    </Link>
  );
});
