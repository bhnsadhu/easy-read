"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { clsx } from "clsx";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
  baseId: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) throw new Error(`${component} must be used inside Tabs`);
  return context;
}

export type TabsProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
};

export function Tabs({ value: valueProp, defaultValue, onValueChange, children, className }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue ?? "");
  const value = valueProp ?? internal;
  const baseId = useId();

  const setValue = useCallback(
    (next: string) => {
      setInternal(next);
      onValueChange?.(next);
    },
    [onValueChange],
  );

  const context = useMemo(() => ({ value, setValue, baseId }), [value, setValue, baseId]);

  return (
    <TabsContext.Provider value={context}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export type TabListProps = HTMLAttributes<HTMLDivElement> & {
  // Names the set of tabs for assistive technology.
  "aria-label": string;
};

// Roving tabindex: only the selected tab is in the tab order; arrows move and select.
export function TabList({ className, onKeyDown, ...rest }: TabListProps) {
  const { setValue } = useTabsContext("TabList");

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'));
    const current = tabs.findIndex((tab) => tab === event.target);
    if (current === -1 || tabs.length === 0) return;

    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = (current + 1) % tabs.length;
        break;
      case "ArrowLeft":
        next = (current - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const target = tabs[next];
    if (!target) return;
    target.focus();
    const value = target.dataset.value;
    if (value !== undefined) setValue(value);
  };

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
      className={clsx("flex gap-1 overflow-x-auto border-b border-border", className)}
      {...rest}
    />
  );
}

export type TabProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
  icon?: ReactNode;
};

export const Tab = forwardRef<HTMLButtonElement, TabProps>(function Tab(
  { value, icon, className, children, onClick, ...rest },
  ref,
) {
  const { value: current, setValue, baseId } = useTabsContext("Tab");
  const selected = current === value;

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={selected ? 0 : -1}
      data-value={value}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setValue(value);
      }}
      className={clsx(
        "-mb-px inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-base font-semibold whitespace-nowrap transition-colors duration-fast ease-brand focus-visible:-outline-offset-2",
        selected
          ? "border-accent text-accent-strong"
          : "border-transparent text-ink-muted hover:border-border-strong hover:text-ink",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-transparent disabled:hover:text-ink-muted",
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

export type TabPanelProps = HTMLAttributes<HTMLDivElement> & {
  value: string;
};

export function TabPanel({ value, className, children, ...rest }: TabPanelProps) {
  const { value: current, baseId } = useTabsContext("TabPanel");
  const selected = current === value;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      hidden={!selected}
      tabIndex={0}
      className={clsx("rounded-sm pt-4", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
