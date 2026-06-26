"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  getTermDepositSettings,
  updateTermDepositSettings,
} from "@/lib/actions";
import { ClockIcon } from "@/components/ui/icons";
import type { TermDepositSettings } from "@/services/term-deposit-service";

const fallbackTermDepositSettings: TermDepositSettings = {
  interestRate: 5,
  isEnabled: false,
  maximumActiveDeposits: 1,
  maximumAmount: 0,
  minimumAmount: 50,
  termDays: 7,
};

export function TermDepositSettingsForm() {
  const [form, setForm] =
    useState<TermDepositSettings>(fallbackTermDepositSettings);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadTermDepositSettings() {
      try {
        const settings = await getTermDepositSettings();

        if (isMounted) {
          setForm(settings);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load term deposit settings.");
        }
      }
    }

    loadTermDepositSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const result = await updateTermDepositSettings(form);

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    setMessage("Term deposit settings saved.");
    setIsSaving(false);
  }

  function updateField<Field extends keyof TermDepositSettings>(
    field: Field,
    value: TermDepositSettings[Field],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <SettingsPanel
        icon={<ClockIcon />}
        title="Term Deposits"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleField
            checked={form.isEnabled}
            label="Enable term deposits"
            onChange={(value) => updateField("isEnabled", value)}
          />
          <NumberTextField
            id="termDepositMinAmount"
            label="Minimum deposit"
            onChange={(value) => updateField("minimumAmount", value)}
            value={form.minimumAmount}
          />
          <NumberTextField
            helper="Use 0 for no maximum."
            id="termDepositMaxAmount"
            label="Maximum deposit"
            onChange={(value) => updateField("maximumAmount", value)}
            value={form.maximumAmount}
          />
          <NumberTextField
            id="termDepositDays"
            label="Fixed term days"
            onChange={(value) => updateField("termDays", value)}
            value={form.termDays}
          />
          <NumberTextField
            allowDecimal
            id="termDepositInterest"
            label="Interest rate percent"
            onChange={(value) => updateField("interestRate", value)}
            value={form.interestRate}
          />
          <NumberTextField
            id="termDepositMaxActive"
            label="Max active per student"
            onChange={(value) => updateField("maximumActiveDeposits", value)}
            value={form.maximumActiveDeposits}
          />
        </div>
      </SettingsPanel>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SettingsMessages error={error} message={message} />
        <button
          className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : "Save Term Deposits"}
        </button>
      </div>
    </form>
  );
}

function SettingsPanel({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="theme-panel min-w-0 overflow-hidden p-4 sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      </div>
      <div className="mt-5 min-w-0">{children}</div>
    </section>
  );
}

function ToggleField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="theme-subpanel flex min-h-16 items-center justify-between gap-3 px-3 py-3 text-sm font-semibold text-text-control">
      <span>{label}</span>
      <input
        checked={checked}
        className="h-5 w-5 accent-brand"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

function NumberTextField({
  allowDecimal = false,
  helper,
  id,
  label,
  onChange,
  value,
}: {
  allowDecimal?: boolean;
  helper?: string;
  id: string;
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  const [displayValue, setDisplayValue] = useState(String(value));

  useEffect(() => {
    window.queueMicrotask(() => {
      setDisplayValue(String(value));
    });
  }, [value]);

  function handleChange(rawValue: string) {
    const sanitisedValue = allowDecimal
      ? rawValue.replace(/[^\d.]/g, "")
      : rawValue.replace(/\D/g, "");

    setDisplayValue(sanitisedValue);

    if (sanitisedValue) {
      onChange(Number(sanitisedValue));
    }
  }

  function handleBlur() {
    if (!displayValue) {
      setDisplayValue(String(value));
    }
  }

  return (
    <div className="min-w-0">
      <label className="text-sm font-semibold text-text-control" htmlFor={id}>
        {label}
      </label>
      <input
        className="mt-2 block w-full min-w-0 max-w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id={id}
        inputMode={allowDecimal ? "decimal" : "numeric"}
        onBlur={handleBlur}
        onChange={(event) => handleChange(event.target.value)}
        value={displayValue}
      />
      {helper && (
        <p className="mt-1 text-xs font-semibold text-text-muted">{helper}</p>
      )}
    </div>
  );
}

function SettingsMessages({
  error,
  message,
}: {
  error: string | null;
  message: string | null;
}) {
  return (
    <div className="min-h-10 flex-1">
      {message && (
        <p className="rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-semibold text-success">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
          {error}
        </p>
      )}
    </div>
  );
}
