import type { ReactNode } from "react";

type PageHeaderProps = {
  actions?: ReactNode;
  description?: string;
  kicker?: string;
  title: string;
  titleSize?: "base" | "large";
};

export function PageHeader({
  actions,
  description,
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
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}
