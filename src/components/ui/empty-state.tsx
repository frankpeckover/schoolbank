import type { ReactNode } from "react";

type EmptyStateProps = {
  action?: ReactNode;
  description: string;
  icon?: ReactNode;
  title: string;
};

export function EmptyState({
  action,
  description,
  icon,
  title,
}: EmptyStateProps) {
  return (
    <div className="rounded-md border border-border-subtle bg-panel-soft px-4 py-5 text-center">
      {icon && (
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-md border border-border-subtle bg-surface text-text-muted">
          {icon}
        </div>
      )}
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-text-muted">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
