"use client";

import type { ReactNode } from "react";
import { ModalCloseButton } from "@/components/ui/modal-close-button";

type ImportModalLayoutProps = {
  children: ReactNode;
  description?: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  title: string;
};

export function ImportModalLayout({
  children,
  description,
  footer,
  onClose,
  title,
}: ImportModalLayoutProps) {
  return (
    <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6">
      <div className="app-modal theme-panel motion-pop flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col shadow-lg">
        <div className="app-modal-header flex shrink-0 items-start justify-between gap-4 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold sm:text-xl">{title}</h3>
            {description && (
              <div className="mt-1 text-sm text-text-muted">
                {description}
              </div>
            )}
          </div>
          <ModalCloseButton onClick={onClose} />
        </div>

        <div className="app-modal-body min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {children}
        </div>

        <div className="app-modal-footer flex shrink-0 flex-col-reverse gap-2 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
          {footer}
        </div>
      </div>
    </div>
  );
}
