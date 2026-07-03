export type StatusTone = "danger" | "neutral" | "success" | "warning";

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex w-fit rounded-sm px-2 py-1 text-xs font-semibold ${getToneClasses(tone)}`}
    >
      {label}
    </span>
  );
}

function getToneClasses(tone: StatusTone) {
  if (tone === "danger") {
    return "bg-danger-soft text-danger-strong";
  }

  if (tone === "success") {
    return "bg-success-soft text-success";
  }

  if (tone === "warning") {
    return "bg-brand-soft text-brand";
  }

  return "bg-chip-bg text-chip-text";
}
