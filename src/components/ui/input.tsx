import {
  cloneElement,
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { ChevronDown, CircleAlert } from "lucide-react";
import { clsx } from "clsx";
import { iconProps, iconPropsSmall } from "./icon";
import { AutoGrowTextarea } from "./textarea-auto-grow";

export type ControlSize = "md" | "lg";

type AriaInvalid = InputHTMLAttributes<HTMLInputElement>["aria-invalid"];

export function controlClasses(size: ControlSize, className?: string) {
  return clsx(
    "w-full rounded-sm border border-border-strong bg-surface-raised text-ink placeholder:text-ink-faint",
    "transition-colors duration-fast ease-brand focus-visible:border-accent",
    "aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:outline-danger",
    "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-muted",
    size === "lg" ? "min-h-11 px-4 text-lg" : "min-h-9 px-3 text-base",
    className,
  );
}

function resolveInvalid(fromProps: AriaInvalid, invalid: boolean | undefined): AriaInvalid {
  return fromProps ?? (invalid ? true : undefined);
}

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  size?: ControlSize;
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = "md", invalid, className, "aria-invalid": ariaInvalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={resolveInvalid(ariaInvalid, invalid)}
      className={controlClasses(size, className)}
      {...rest}
    />
  );
});

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  size?: ControlSize;
  invalid?: boolean;
  // Grows with its content instead of scrolling. Static height when off.
  autoGrow?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { size = "md", invalid, autoGrow = false, className, rows = 4, "aria-invalid": ariaInvalid, ...rest },
  ref,
) {
  const classes = clsx(
    controlClasses(size),
    "py-2",
    autoGrow ? "resize-none field-sizing-content" : "resize-y",
    className,
  );
  const resolved = resolveInvalid(ariaInvalid, invalid);
  if (autoGrow) {
    return <AutoGrowTextarea ref={ref} rows={rows} aria-invalid={resolved} className={classes} {...rest} />;
  }
  return <textarea ref={ref} rows={rows} aria-invalid={resolved} className={classes} {...rest} />;
});

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  size?: ControlSize;
  invalid?: boolean;
  wrapperClassName?: string;
};

// Native select, styled. Keeps the platform picker on phones.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { size = "md", invalid, className, wrapperClassName, children, "aria-invalid": ariaInvalid, ...rest },
  ref,
) {
  return (
    <span className={clsx("relative block", wrapperClassName)}>
      <select
        ref={ref}
        aria-invalid={resolveInvalid(ariaInvalid, invalid)}
        className={clsx(controlClasses(size, className), "cursor-pointer appearance-none pr-10")}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        {...iconProps}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-muted"
      />
    </span>
  );
});

type FieldControlProps = {
  id?: string;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: AriaInvalid;
};

export type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  // What happened and what to do next (BRAND.md §10). Marks the control invalid.
  error?: ReactNode;
  required?: boolean;
  // Shows "(optional)" after the label.
  optional?: boolean;
  id?: string;
  className?: string;
  children: ReactElement<FieldControlProps>;
};

// Wires a label, hint and error to one control via id, aria-describedby and aria-invalid.
export function Field({ label, hint, error, required, optional, id: idProp, className, children }: FieldProps) {
  const autoId = useId();
  const id = idProp ?? children.props.id ?? autoId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [children.props["aria-describedby"], hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  const control = cloneElement(children, {
    id,
    required: required ?? children.props.required,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : children.props["aria-invalid"],
  });

  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {optional && <span className="font-normal text-ink-muted"> (optional)</span>}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {control}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm text-danger">
          <CircleAlert {...iconPropsSmall} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
