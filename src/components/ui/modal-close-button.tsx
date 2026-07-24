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
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted transition hover:bg-surface-muted hover:text-text-control"
      onClick={onClick}
      title={label}
      type="button"
    >
      <XIcon className="h-4 w-4" />
    </button>
  );
}
