"use client";

import { useState } from "react";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";

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
  const dialogRef = useDialogFocus({ onEscape: onCancel });

  function handleConfirm() {
    const trimmedReason = reason.trim();

    if (isRequired && !trimmedReason) {
      setError("Enter a reason.");
      return;
    }

    onConfirm(trimmedReason);
  }

  return (
    <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        aria-label={title}
        aria-modal="true"
        className="app-modal theme-panel motion-pop w-full max-w-md p-5 shadow-lg"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="app-modal-header flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-text-muted">{description}</p>
          </div>
          <ModalCloseButton onClick={onCancel} />
        </div>

        <div className="app-modal-body">
          <label
            className="block text-sm font-semibold text-text-control"
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
            <p
              className="mt-3 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <div className="app-modal-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
