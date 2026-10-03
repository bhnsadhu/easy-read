"use client";

import { forwardRef, useCallback, type Ref, type TextareaHTMLAttributes } from "react";

function fit(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  const borders = element.offsetHeight - element.clientHeight;
  element.style.height = `${element.scrollHeight + borders}px`;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

// Client half of Textarea's autoGrow: resizes to fit on every input and once on
// mount. Browsers with field-sizing: content do the same in CSS; this covers the rest.
export const AutoGrowTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function AutoGrowTextarea({ onInput, ...rest }, ref) {
    const setRef = useCallback(
      (element: HTMLTextAreaElement | null) => {
        if (element) fit(element);
        assignRef(ref, element);
        return () => assignRef(ref, null);
      },
      [ref],
    );

    const handleInput: NonNullable<TextareaHTMLAttributes<HTMLTextAreaElement>["onInput"]> = (event) => {
      fit(event.currentTarget);
      onInput?.(event);
    };

    return <textarea ref={setRef} onInput={handleInput} {...rest} />;
  },
);
