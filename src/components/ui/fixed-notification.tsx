"use client";

import { useEffect, useState } from "react";
import { XIcon } from "@/components/ui/icons";

type FixedNotificationProps = {
  error?: string | null;
  message?: string | null;
};

const successNotificationDurationMs = 4500;

export function FixedNotification({
  error,
  message,
}: FixedNotificationProps) {
  const text = error ?? message;
  const tone = error ? "error" : "success";
  const [visibleText, setVisibleText] = useState<string | null>(text ?? null);
  const [visibleTone, setVisibleTone] = useState(tone);

  useEffect(() => {
    if (!text) {
      setVisibleText(null);
      return;
    }

    setVisibleText(text);
    setVisibleTone(tone);

    if (tone === "error") {
      return;
    }

    const timeoutId = window.setTimeout(
      () => setVisibleText(null),
      successNotificationDurationMs,
    );

    return () => window.clearTimeout(timeoutId);
  }, [text, tone]);

  if (!visibleText) {
    return null;
  }

  const toneClassName =
    visibleTone === "error"
      ? "border-danger-border bg-danger-soft text-danger-strong"
      : "border-success-border bg-success-soft text-success";
  const role = visibleTone === "error" ? "alert" : "status";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[180] flex justify-center px-4">
      <div
        className={`pointer-events-auto motion-pop flex w-full max-w-md items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm shadow-lg ${toneClassName}`}
        role={role}
      >
        <p className="min-w-0 break-words font-medium">{visibleText}</p>
        <button
          aria-label="Dismiss notification"
          className="shrink-0 rounded-md p-1 text-current opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
          onClick={() => setVisibleText(null)}
          type="button"
        >
          <XIcon />
        </button>
      </div>
    </div>
  );
}
