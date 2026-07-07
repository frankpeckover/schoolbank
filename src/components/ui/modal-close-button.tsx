import { XIcon } from "@/components/ui/icons";

type ModalCloseButtonProps = {
  label?: string;
  onClick: () => void;
};

export function ModalCloseButton({
  label = "Close",
  onClick,
}: ModalCloseButtonProps) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-button-border text-text-control transition hover:bg-panel-soft sm:h-auto sm:w-auto sm:px-3 sm:py-2 sm:text-sm sm:font-semibold"
      onClick={onClick}
      type="button"
    >
      <span className="sm:hidden">
        <XIcon />
      </span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
