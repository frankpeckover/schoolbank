"use client";

import type { ReactNode } from "react";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";

type ModalShellProps = {
  actions?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
  onClose?: () => void;
  title: string;
};

export function ModalShell({
  actions,
  children,
  description,
  footer,
  maxWidthClassName = "max-w-2xl",
  onClose,
  title,
}: ModalShellProps) {
  const dialogRef = useDialogFocus({ onEscape: onClose });

  return (
    <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div
        aria-label={title}
        aria-modal="true"
        className={`app-modal theme-panel motion-pop max-h-full w-full ${maxWidthClassName} overflow-y-auto p-5 shadow-lg`}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="app-modal-header flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold">{title}</h3>
            {description && (
              <div className="mt-1 text-sm text-text-muted">{description}</div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            {onClose && <ModalCloseButton onClick={onClose} />}
          </div>
        </div>

        <div className="app-modal-body">{children}</div>

        {footer && (
          <div className="app-modal-footer flex justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
