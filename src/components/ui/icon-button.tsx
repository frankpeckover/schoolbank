import type { ReactNode } from "react";

type IconButtonTone = "default" | "danger" | "primary";

type IconButtonProps = {
  ariaExpanded?: boolean;
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  tone?: IconButtonTone;
};

const toneClassNames: Record<IconButtonTone, string> = {
  danger:
    "border-danger-button-border text-danger-strong hover:bg-danger-soft",
  default: "border-button-border text-text-control hover:bg-surface",
  primary: "border-brand bg-brand text-white hover:bg-brand-hover",
};

export function IconButton({
  ariaExpanded,
  children,
  disabled = false,
  label,
  onClick,
  tone = "default",
}: IconButtonProps) {
  return (
    <button
      aria-expanded={ariaExpanded}
      aria-label={label}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClassNames[tone]}`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
