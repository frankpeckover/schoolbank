import type {
  AdjustmentDirection,
} from "@/components/transactions/ledger-adjustment-types";

type AdjustmentDetailsPanelProps = {
  amount: string;
  amountPresets: number[];
  canSubmit: boolean;
  currencyName: string;
  direction: AdjustmentDirection;
  isSaving: boolean;
  onAmountChange: (value: string) => void;
  onDirectionChange: (direction: AdjustmentDirection) => void;
  onReasonChange: (value: string) => void;
  reason: string;
  reasonPresets: string[];
  submitLabel: string;
};

export function AdjustmentDetailsPanel({
  amount,
  amountPresets,
  canSubmit,
  currencyName,
  direction,
  isSaving,
  onAmountChange,
  onDirectionChange,
  onReasonChange,
  reason,
  reasonPresets,
  submitLabel,
}: AdjustmentDetailsPanelProps) {
  return (
    <section className="theme-card p-3">
      <div className="grid gap-3 lg:grid-cols-[auto_1fr]">
        <DirectionToggle
          direction={direction}
          onChange={onDirectionChange}
        />

        <AmountField
          amount={amount}
          currencyName={currencyName}
          onAmountChange={onAmountChange}
          presets={amountPresets}
        />
      </div>

      <ReasonField
        onReasonChange={onReasonChange}
        presets={reasonPresets}
        reason={reason}
      />

      <button
        className="mt-4 w-full rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
        disabled={!canSubmit}
        type="submit"
      >
        {isSaving ? "Saving..." : submitLabel}
      </button>
    </section>
  );
}

function DirectionToggle({
  direction,
  onChange,
}: {
  direction: AdjustmentDirection;
  onChange: (direction: AdjustmentDirection) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-text-control">Action</p>
      <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-md border border-button-border">
        <button
          className={`px-4 py-3 text-sm font-semibold transition ${
            direction === "add"
              ? "bg-brand text-white"
              : "bg-surface text-text-control hover:bg-panel-soft"
          }`}
          onClick={() => onChange("add")}
          type="button"
        >
          Add
        </button>
        <button
          className={`px-4 py-3 text-sm font-semibold transition ${
            direction === "remove"
              ? "bg-danger text-white"
              : "bg-surface text-text-control hover:bg-panel-soft"
          }`}
          onClick={() => onChange("remove")}
          type="button"
        >
          Take
        </button>
      </div>
    </div>
  );
}

function AmountField({
  amount,
  currencyName,
  onAmountChange,
  presets,
}: {
  amount: string;
  currencyName: string;
  onAmountChange: (value: string) => void;
  presets: number[];
}) {
  return (
    <div>
      <label
        className="text-sm font-semibold text-text-control"
        htmlFor="amount"
      >
        {currencyName}
      </label>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {presets.map((preset) => (
          <button
            className="rounded-md border border-button-border px-3 py-2 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
            key={preset}
            onClick={() => onAmountChange(String(preset))}
            type="button"
          >
            {preset}
          </button>
        ))}
      </div>
      <input
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id="amount"
        min="1"
        onChange={(event) => onAmountChange(event.target.value)}
        placeholder="Custom amount"
        type="number"
        value={amount}
      />
    </div>
  );
}

function ReasonField({
  onReasonChange,
  presets,
  reason,
}: {
  onReasonChange: (value: string) => void;
  presets: string[];
  reason: string;
}) {
  return (
    <div className="mt-4">
      <label
        className="text-sm font-semibold text-text-control"
        htmlFor="reason"
      >
        Reason
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            className="rounded-md border border-button-border px-3 py-2 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
            key={preset}
            onClick={() => onReasonChange(preset)}
            type="button"
          >
            {preset}
          </button>
        ))}
      </div>
      <input
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id="reason"
        onChange={(event) => onReasonChange(event.target.value)}
        value={reason}
      />
    </div>
  );
}
