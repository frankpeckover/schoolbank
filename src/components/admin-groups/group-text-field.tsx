type GroupTextFieldProps = {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
};

export function GroupTextField({
  id,
  label,
  onChange,
  value,
}: GroupTextFieldProps) {
  return (
    <div className="mt-3">
      <label className="text-sm font-semibold text-text-control" htmlFor={id}>
        {label}
      </label>
      <input
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </div>
  );
}
