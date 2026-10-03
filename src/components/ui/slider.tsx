"use client";

import { useId, useState, type ChangeEvent, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { clsx } from "clsx";
import { IconButton } from "./icon-button";
import { iconProps } from "./icon";

export type SliderProps = {
  label: ReactNode;
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number) => void;
  // Formats the readout and aria-valuetext, for example "18px" or "150 wpm".
  formatValue?: (value: number) => string;
  // 44px minus/plus buttons for touch. On by default.
  stepButtons?: boolean;
  decrementLabel?: string;
  incrementLabel?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
};

// The native input draws a transparent track and a token-colored thumb; the
// visible track and fill sit underneath so every browser shows progress.
const rangeClasses = clsx(
  "relative z-10 h-11 w-full min-w-0 cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed",
  "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-transparent",
  "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:bg-transparent",
  "[&::-webkit-slider-thumb]:-mt-2.25 [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface-raised [&::-webkit-slider-thumb]:bg-accent",
  "[&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-surface-raised [&::-moz-range-thumb]:bg-accent",
);

function decimalsOf(step: number) {
  const text = String(step);
  const index = text.indexOf(".");
  return index === -1 ? 0 : text.length - index - 1;
}

export function Slider({
  label,
  value: valueProp,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  formatValue,
  stepButtons = true,
  decrementLabel = "Decrease",
  incrementLabel = "Increase",
  id: idProp,
  name,
  disabled = false,
  className,
}: SliderProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [internal, setInternal] = useState(defaultValue ?? min);
  const value = valueProp ?? internal;
  const decimals = decimalsOf(step);
  const display = formatValue ? formatValue(value) : String(value);
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;

  const update = (next: number) => {
    const snapped = Number((Math.round(next / step) * step).toFixed(decimals));
    const clamped = Math.min(Math.max(snapped, min), max);
    setInternal(clamped);
    onValueChange?.(clamped);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.currentTarget.value);
    setInternal(next);
    onValueChange?.(next);
  };

  return (
    <div className={clsx("flex flex-col gap-1", disabled && "opacity-60", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-base font-semibold text-ink">
          {label}
        </label>
        <output htmlFor={id} className="tabular text-sm text-ink-muted">
          {display}
        </output>
      </div>
      <div className="flex items-center gap-3">
        {stepButtons && (
          <IconButton
            aria-label={decrementLabel}
            variant="secondary"
            size="lg"
            disabled={disabled || value <= min}
            onClick={() => update(value - step)}
          >
            <Minus {...iconProps} />
          </IconButton>
        )}
        <div className="relative flex min-w-0 flex-1 items-center">
          <div aria-hidden="true" className="absolute inset-x-3 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-border-strong">
            <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
          </div>
          <input
            id={id}
            name={name}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            aria-valuetext={display}
            onChange={handleChange}
            className={rangeClasses}
          />
        </div>
        {stepButtons && (
          <IconButton
            aria-label={incrementLabel}
            variant="secondary"
            size="lg"
            disabled={disabled || value >= max}
            onClick={() => update(value + step)}
          >
            <Plus {...iconProps} />
          </IconButton>
        )}
      </div>
    </div>
  );
}
