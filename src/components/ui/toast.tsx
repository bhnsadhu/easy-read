"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "./button";
import { IconButton } from "./icon-button";
import { iconProps, iconPropsSmall } from "./icon";

export type ToastVariant = "neutral" | "success" | "danger";

export type ToastOptions = {
  title: string;
  description?: ReactNode;
  variant?: ToastVariant;
  // Milliseconds before auto-dismiss. Pauses while hovered or focused.
  duration?: number;
  action?: { label: string; onClick: () => void };
};

type ToastItem = ToastOptions & { id: number; variant: ToastVariant; duration: number };

type ToastContextValue = {
  toast: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
};

type Timer = { handle: ReturnType<typeof setTimeout> | null; remaining: number; startedAt: number };

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 5000;
const MIN_RESUME = 1000;

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside a ToastProvider");
  return context;
}

type ToastState = { visible: ToastItem[]; queued: ToastItem[] };

function promote(visible: ToastItem[], queued: ToastItem[]): ToastState {
  const nextVisible = [...visible];
  const nextQueued = [...queued];
  while (nextVisible.length < MAX_VISIBLE) {
    const next = nextQueued.shift();
    if (!next) break;
    nextVisible.push(next);
  }
  return { visible: nextVisible, queued: nextQueued };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState>({ visible: [], queued: [] });
  const nextId = useRef(0);
  const timers = useRef(new Map<number, Timer>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer?.handle) clearTimeout(timer.handle);
    timers.current.delete(id);
    setState((previous) => {
      const inVisible = previous.visible.some((item) => item.id === id);
      const inQueue = previous.queued.some((item) => item.id === id);
      if (!inVisible && !inQueue) return previous;
      return promote(
        previous.visible.filter((item) => item.id !== id),
        previous.queued.filter((item) => item.id !== id),
      );
    });
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    nextId.current += 1;
    const id = nextId.current;
    const item: ToastItem = {
      ...options,
      id,
      variant: options.variant ?? "neutral",
      duration: options.duration ?? DEFAULT_DURATION,
    };
    setState((previous) => promote(previous.visible, [...previous.queued, item]));
    return id;
  }, []);

  const pause = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (!timer?.handle) return;
    clearTimeout(timer.handle);
    timers.current.set(id, {
      handle: null,
      remaining: Math.max(0, timer.remaining - (Date.now() - timer.startedAt)),
      startedAt: timer.startedAt,
    });
  }, []);

  const resume = useCallback(
    (id: number) => {
      const timer = timers.current.get(id);
      if (!timer || timer.handle) return;
      const remaining = Math.max(timer.remaining, MIN_RESUME);
      timers.current.set(id, {
        handle: setTimeout(() => dismiss(id), remaining),
        remaining,
        startedAt: Date.now(),
      });
    },
    [dismiss],
  );

  // Start a timer for every toast that just became visible.
  useEffect(() => {
    const map = timers.current;
    for (const item of state.visible) {
      if (map.has(item.id)) continue;
      map.set(item.id, {
        handle: setTimeout(() => dismiss(item.id), item.duration),
        remaining: item.duration,
        startedAt: Date.now(),
      });
    }
  }, [state.visible, dismiss]);

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const timer of map.values()) {
        if (timer.handle) clearTimeout(timer.handle);
      }
      map.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:inset-x-auto md:right-6 md:bottom-6 md:items-end md:px-0 md:pb-0"
      >
        {state.visible.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismiss} onPause={pause} onResume={resume} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const icons = {
  neutral: Info,
  success: CircleCheck,
  danger: CircleAlert,
} as const;

const iconTones: Record<ToastVariant, string> = {
  neutral: "text-ink-muted",
  success: "text-success",
  danger: "text-danger",
};

type ToastCardProps = {
  item: ToastItem;
  onDismiss: (id: number) => void;
  onPause: (id: number) => void;
  onResume: (id: number) => void;
};

function ToastCard({ item, onDismiss, onPause, onResume }: ToastCardProps) {
  const Icon = icons[item.variant];

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    onResume(item.id);
  };

  return (
    <div
      className={clsx(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-surface-raised py-3 pr-2 pl-4 text-ink shadow-float",
        "transition-[opacity,translate] duration-base ease-brand starting:opacity-0 motion-safe:starting:translate-y-2",
      )}
      onMouseEnter={() => onPause(item.id)}
      onMouseLeave={() => onResume(item.id)}
      onFocus={() => onPause(item.id)}
      onBlur={handleBlur}
    >
      <Icon {...iconProps} className={clsx("mt-0.5 shrink-0", iconTones[item.variant])} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <p className="text-base font-semibold text-ink">{item.title}</p>
        {item.description && <p className="text-sm text-ink-muted">{item.description}</p>}
        {item.action && (
          <div className="mt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                item.action?.onClick();
                onDismiss(item.id);
              }}
            >
              {item.action.label}
            </Button>
          </div>
        )}
      </div>
      <IconButton aria-label="Dismiss" variant="ghost" size="sm" onClick={() => onDismiss(item.id)}>
        <X {...iconPropsSmall} />
      </IconButton>
    </div>
  );
}
