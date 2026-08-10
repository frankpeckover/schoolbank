"use client";

import { useEffect, useRef } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

type UseDialogFocusOptions = {
  onEscape?: () => void;
};

export function useDialogFocus({ onEscape }: UseDialogFocusOptions = {}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = useRef<Element | null>(null);
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    previousActiveElementRef.current = document.activeElement;

    const initialFocusTarget = getFocusableElements(dialog)[0] ?? dialog;
    initialFocusTarget.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (!dialog) {
        return;
      }

      if (event.key === "Escape" && onEscapeRef.current) {
        event.preventDefault();
        onEscapeRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements(dialog);

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      const previousActiveElement = previousActiveElementRef.current;

      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    };
  }, []);

  return dialogRef;
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelector),
  ).filter(
    (element) =>
      element.tabIndex !== -1 &&
      !element.hasAttribute("disabled") &&
      !element.getAttribute("aria-hidden") &&
      isElementVisible(element),
  );
}

function isElementVisible(element: HTMLElement) {
  return Boolean(
    element.offsetWidth ||
      element.offsetHeight ||
      element.getClientRects().length,
  );
}
