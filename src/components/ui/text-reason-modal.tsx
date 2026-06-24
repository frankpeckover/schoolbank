"use client";

import { useState } from "react";

type TextReasonModalProps = {
  confirmLabel: string;
  description: string;
  isRequired?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  title: string;
};

export function TextReasonModal({
  confirmLabel,
  description,
  isRequired = false,
  onCancel,
  onConfirm,
  title,
}: TextReasonModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    const trimmedReason = reason.trim();

    if (isRequired && !trimmedReason) {
      setError("Enter a reason.");
      return;
    }

    onConfirm(trimmedReason);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
      <div className="theme-panel motion-pop w-full max-w-md p-5 shadow-lg">
        <div>
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        </div>

        <label
          className="mt-4 block text-sm font-semibold text-text-control"
          htmlFor="reason"
        >
          Reason
        </label>
        <textarea
          className="mt-2 min-h-28 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
          id="reason"
          onChange={(event) => {
            setReason(event.target.value);
            setError(null);
          }}
          value={reason}
        />

        {error && (
          <p className="mt-3 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="rounded-md border border-button-border px-4 py-2 text-sm font-semibold text-text-control transition hover:bg-surface-hover"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
            onClick={handleConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
