import type { ReactNode } from "react";

type PageHeaderProps = {
  actions?: ReactNode;
  description?: string;
  icon?: ReactNode;
  kicker?: string;
  title: string;
  titleSize?: "base" | "large";
};

export function PageHeader({
  actions,
  description,
  icon,
  kicker,
  title,
  titleSize = "large",
}: PageHeaderProps) {
  const titleClassName =
    titleSize === "large"
      ? "truncate text-2xl font-semibold"
      : "truncate text-xl font-semibold";

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          {kicker && (
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-kicker">
              {kicker}
            </p>
          )}
          <h2 className={titleClassName}>{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-text-muted">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}
