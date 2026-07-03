import type { ReactNode } from "react";

type IconButtonTone = "default" | "danger" | "primary";

type IconButtonProps = {
  ariaExpanded?: boolean;
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  text?: string;
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
  text,
  tone = "default",
}: IconButtonProps) {
  return (
    <button
      aria-expanded={ariaExpanded}
      aria-label={label}
      className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
        text ? "w-10 sm:w-auto sm:px-4" : "w-10"
      } ${toneClassNames[tone]}`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
      {text && <span className="hidden sm:inline">{text}</span>}
    </button>
  );
}
