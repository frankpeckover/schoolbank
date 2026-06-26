"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createTermDeposit,
  getTermDepositSettings,
  listStudentTermDeposits,
} from "@/lib/actions";
import { formatCurrencyAmount, formatDateTime } from "@/lib/formatters";
import type {
  StudentTermDeposit,
  TermDepositSettings,
} from "@/services/term-deposit-service";
import { ClockIcon } from "@/components/ui/icons";

type StudentTermDepositCardProps = {
  balance: number;
  currencyName: string;
  onBalanceChanged: () => void;
};

const defaultSettings: TermDepositSettings = {
  interestRate: 0,
  isEnabled: false,
  maximumActiveDeposits: 1,
  maximumAmount: 0,
  minimumAmount: 0,
  termDays: 0,
};
const depositsPreviewLimit = 3;
const activeDepositStatus = "active";

export function StudentTermDepositCard({
  balance,
  currencyName,
  onBalanceChanged,
}: StudentTermDepositCardProps) {
  const [amount, setAmount] = useState("");
  const [deposits, setDeposits] = useState<StudentTermDeposit[]>([]);
  const [settings, setSettings] =
    useState<TermDepositSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTermDeposits() {
      try {
        const [loadedSettings, loadedDeposits] = await Promise.all([
          getTermDepositSettings(),
          listStudentTermDeposits(),
        ]);

        if (isMounted) {
          setSettings(loadedSettings);
          setDeposits(loadedDeposits);
          setMessage(null);
          onBalanceChanged();
        }
      } catch {
        if (isMounted) {
          setMessage("Could not load term deposits.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTermDeposits();

    return () => {
      isMounted = false;
    };
  }, [onBalanceChanged]);

  const parsedAmount = Number.parseInt(amount, 10) || 0;
  const interestAmount = useMemo(
    () => Math.round(parsedAmount * (settings.interestRate / 100)),
    [parsedAmount, settings.interestRate],
  );
  const maturityAmount = parsedAmount + interestAmount;
  const activeDeposits = deposits.filter(
    (deposit) => deposit.status === activeDepositStatus,
  );
  const canCreateDeposit =
    settings.isEnabled &&
    parsedAmount >= settings.minimumAmount &&
    balance >= parsedAmount &&
    activeDeposits.length < settings.maximumActiveDeposits;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const result = await createTermDeposit({ amount: parsedAmount });

    if (!result.ok) {
      setMessage(result.message);
      setIsSaving(false);
      return;
    }

    const loadedDeposits = await listStudentTermDeposits();
    setDeposits(loadedDeposits);
    setAmount("");
    setMessage("Term deposit created.");
    setIsSaving(false);
    onBalanceChanged();
  }

  function handleAmountChange(value: string) {
    setAmount(value.replace(/\D/g, ""));
  }

  if (!isLoading && !settings.isEnabled) {
    return null;
  }

  return (
    <section className="motion-panel mt-4 rounded-3xl border border-border-subtle bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <ClockIcon />
          </span>
          <h2 className="truncate text-base font-semibold text-foreground">
            Term Deposit
          </h2>
        </div>
        {settings.isEnabled && (
          <span className="rounded-full bg-panel-soft px-3 py-1 text-xs font-semibold text-text-muted">
            {settings.termDays} days
          </span>
        )}
      </div>

      {isLoading && (
        <p className="mt-4 text-sm text-text-muted">Loading term deposits...</p>
      )}

      {!isLoading && settings.isEnabled && (
        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <form className="theme-subpanel space-y-3 p-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <DepositFact
                label="Minimum"
                value={formatCurrencyAmount(
                  settings.minimumAmount,
                  currencyName,
                )}
              />
              <DepositFact
                label="Interest"
                value={`${settings.interestRate}%`}
              />
            </div>

            <label className="block text-sm font-semibold text-text-control">
              Deposit amount
              <input
                className="mt-2 block w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
                inputMode="numeric"
                onChange={(event) => handleAmountChange(event.target.value)}
                placeholder={String(settings.minimumAmount)}
                value={amount}
              />
            </label>

            <div className="rounded-2xl bg-surface px-3 py-3 text-sm">
              <p className="font-semibold text-text-control">
                Maturity payout
              </p>
              <p className="mt-1 text-2xl font-semibold text-brand">
                {formatCurrencyAmount(maturityAmount, currencyName)}
              </p>
            </div>

            <button
              className="w-full rounded-md bg-brand px-3 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canCreateDeposit || isSaving}
              type="submit"
            >
              {isSaving ? "Creating..." : "Create Deposit"}
            </button>
          </form>

          <div className="space-y-3">
            {activeDeposits.length === 0 && (
              <p className="rounded-2xl bg-panel-soft px-4 py-5 text-sm text-text-muted">
                No active term deposits.
              </p>
            )}

            {activeDeposits.slice(0, depositsPreviewLimit).map((deposit) => (
              <DepositRow
                currencyName={currencyName}
                deposit={deposit}
                key={deposit.id}
              />
            ))}
          </div>
        </div>
      )}

      {message && (
        <p className="mt-3 rounded-md bg-panel-soft px-3 py-2 text-sm font-semibold text-text-muted">
          {message}
        </p>
      )}
    </section>
  );
}

function DepositFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-kicker">
        {label}
      </p>
      <p className="mt-1 font-semibold text-foreground">{value}</p>
    </div>
  );
}

function DepositRow({
  currencyName,
  deposit,
}: {
  currencyName: string;
  deposit: StudentTermDeposit;
}) {
  return (
    <article className="rounded-2xl border border-border-subtle bg-panel-soft px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">
            {formatCurrencyAmount(deposit.principalAmount, currencyName)}
          </p>
          <p className="mt-1 text-xs font-semibold text-text-muted">
            {deposit.status === "active"
              ? `Matures ${formatDateTime(deposit.maturesAt)}`
              : `Paid ${formatCurrencyAmount(
                  deposit.maturityAmount,
                  currencyName,
                )}`}
          </p>
        </div>
        <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold capitalize text-text-muted">
          {deposit.status.replace("_", " ")}
        </span>
      </div>
    </article>
  );
}
