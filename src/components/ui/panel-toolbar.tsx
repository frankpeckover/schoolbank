import type { ReactNode } from "react";

type PanelToolbarProps = {
  actions?: ReactNode;
  children?: ReactNode;
};

export function PanelToolbar({ actions, children }: PanelToolbarProps) {
  if (!actions && !children) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="min-w-0 flex-1">{children}</div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
