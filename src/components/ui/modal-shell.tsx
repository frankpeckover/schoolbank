import type { ReactNode } from "react";
import { ModalCloseButton } from "@/components/ui/modal-close-button";

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
        className={`app-modal theme-panel motion-pop max-h-full w-full ${maxWidthClassName} overflow-y-auto p-5 shadow-lg`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-subtle pb-4">
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

        <div className="mt-5">{children}</div>

        {footer && (
          <div className="mt-5 flex justify-end border-t border-border-subtle pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
