import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { buttonClasses, Spinner, type ButtonSize, type ButtonVariant } from "./button";

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children"> & {
  // Icons never appear without a name (BRAND.md §8). The label is required.
  "aria-label": string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = "ghost", size = "md", loading = false, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, square: true, className })}
      {...rest}
    >
      {loading ? <Spinner size={size === "sm" ? "sm" : "md"} /> : children}
    </button>
  );
});
