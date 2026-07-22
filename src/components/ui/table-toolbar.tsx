import type { ReactNode } from "react";

type TableToolbarProps = {
  actions?: ReactNode;
  children?: ReactNode;
};

export function TableToolbar({ actions, children }: TableToolbarProps) {
  if (!actions && !children) {
    return null;
  }

  return (
    <div className="table-toolbar-band flex min-w-0 items-center justify-between gap-3">
      <div className="min-w-0 flex-1">{children}</div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
