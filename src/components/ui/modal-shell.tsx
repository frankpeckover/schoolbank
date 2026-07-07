import type { ReactNode } from "react";

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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6">
      <div
        className={`theme-panel motion-pop max-h-full w-full ${maxWidthClassName} overflow-y-auto p-5 shadow-lg`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-subtle pb-4">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold">{title}</h3>
            {description && (
              <div className="mt-1 text-sm text-text-muted">{description}</div>
            )}
          </div>
          {actions}
        </div>

        <div className="mt-5">{children}</div>

        {(footer || onClose) && (
          <div className="mt-5 flex justify-end border-t border-border-subtle pt-4">
            {footer ?? (
              <button
                className="rounded-md border border-button-border px-4 py-2 text-sm font-semibold text-text-control transition hover:bg-surface-hover"
                onClick={onClose}
                type="button"
              >
                Close
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
