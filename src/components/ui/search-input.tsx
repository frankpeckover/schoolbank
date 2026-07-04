import { SearchIcon } from "@/components/ui/icons";

type SearchInputProps = {
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

export function SearchInput({
  ariaLabel,
  className = "",
  disabled = false,
  id,
  onChange,
  placeholder,
  value,
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      <input
        aria-label={ariaLabel}
        className="w-full rounded-md border border-border bg-surface py-3 pl-10 pr-3 text-sm outline-none ring-brand transition placeholder:text-text-muted focus:ring-2 disabled:cursor-not-allowed disabled:bg-panel-soft disabled:text-text-muted"
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}
