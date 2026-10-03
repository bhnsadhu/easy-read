import { useId } from "react";
import { Circle, CircleCheck, CircleX } from "lucide-react";
import { clsx } from "clsx";
import { Spinner } from "./button";
import { iconProps } from "./icon";
import { VisuallyHidden } from "./visually-hidden";

export type ProgressProps = {
  value: number;
  max?: number;
  // Accessible name. Visible unless hideLabel is set.
  label: string;
  hideLabel?: boolean;
  showValue?: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function Progress({ value, max = 100, label, hideLabel = false, showValue = true, size = "md", className }: ProgressProps) {
  const labelId = useId();
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = Math.round((clamped / safeMax) * 100);

  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span id={labelId} className={clsx("font-semibold text-ink", hideLabel && "sr-only")}>
          {label}
        </span>
        {showValue && <span className="tabular text-ink-muted">{percent}%</span>}
      </div>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={clamped}
        className={clsx("w-full overflow-hidden rounded-full bg-border", size === "sm" ? "h-1.5" : "h-2")}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-base ease-brand"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export type StepState = "pending" | "active" | "done" | "failed";

export type StepItem = {
  id: string;
  label: string;
  detail?: string;
  state: StepState;
};

const stateText: Record<StepState, string> = {
  pending: "not started",
  active: "in progress",
  done: "done",
  failed: "failed",
};

function StepIcon({ state }: { state: StepState }) {
  switch (state) {
    case "active":
      return <Spinner className="text-accent" />;
    case "done":
      return <CircleCheck {...iconProps} className="text-success" />;
    case "failed":
      return <CircleX {...iconProps} className="text-danger" />;
    default:
      return <Circle {...iconProps} className="text-ink-faint" />;
  }
}

export type StepsProps = {
  items: StepItem[];
  label?: string;
  className?: string;
};

// Per-step state for the processing screen. Each state has an icon and a word.
export function Steps({ items, label = "Progress", className }: StepsProps) {
  return (
    <ol aria-label={label} className={clsx("flex flex-col gap-3", className)}>
      {items.map((item) => (
        <li
          key={item.id}
          aria-current={item.state === "active" ? "step" : undefined}
          className="flex items-start gap-3"
        >
          <span className="flex size-6 shrink-0 items-center justify-center">
            <StepIcon state={item.state} />
          </span>
          <span className="flex flex-col">
            <span
              className={clsx(
                "text-base",
                item.state === "pending" ? "text-ink-muted" : "text-ink",
                item.state === "active" && "font-semibold",
                item.state === "failed" && "text-danger",
              )}
            >
              {item.label}
              <VisuallyHidden>, {stateText[item.state]}</VisuallyHidden>
            </span>
            {item.detail && <span className="text-sm text-ink-muted">{item.detail}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
