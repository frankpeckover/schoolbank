"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ShopRequestsPanel } from "@/components/shop/shop-requests-panel";
import { LedgerAdjustmentForm } from "@/components/transactions/ledger-adjustment-form";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { getTeacherDashboardSummary, listStudentBalances } from "@/lib/actions";
import { formatCurrencyAmount } from "@/lib/formatters";
import type {
  TeacherDashboardSummary,
  TeacherIssuedPeriodTotals,
} from "@/services/teacher-dashboard-service";
import type { StudentBalanceItem } from "@/services/transaction-service";

type TeacherDashboardPanelProps = {
  currencyName: string;
  schoolName: string;
};

export function TeacherDashboardPanel({
  currencyName,
  schoolName,
}: TeacherDashboardPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <>
      <section className="motion-panel mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <section className="section-highlight theme-panel p-4 sm:p-5">
          <div className="flex h-full min-h-52 flex-col">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-brand-soft text-brand">
                <WalletIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-kicker">
                  Teacher dashboard
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  Record {currencyName}
                </h2>
              </div>
            </div>

            <LedgerAdjustmentForm
              currencyName={currencyName}
              onCreated={setMessage}
              onError={setError}
            />

            {message && (
              <p className="mt-4 rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-semibold text-success">
                {message}
              </p>
            )}
            {error && (
              <p className="mt-4 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
                {error}
              </p>
            )}
          </div>
        </section>

        <TeacherActivityPanel
          currencyName={currencyName}
          schoolName={schoolName}
        />
      </section>

      <ShopRequestsPanel currencyName={currencyName} />
    </>
  );
}

function TeacherActivityPanel({
  currencyName,
  schoolName,
}: {
  currencyName: string;
  schoolName: string;
}) {
  const [balances, setBalances] = useState<StudentBalanceItem[]>([]);
  const [summary, setSummary] = useState<TeacherDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadActivity() {
      try {
        const [loadedBalances, loadedSummary] = await Promise.all([
          listStudentBalances(),
          getTeacherDashboardSummary(),
        ]);

        if (isMounted) {
          setBalances(loadedBalances.filter((student) => student.isActive));
          setSummary(loadedSummary);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load teacher activity.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadActivity();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalBalance = balances.reduce(
    (total, student) => total + student.balance,
    0,
  );

  return (
    <section
      aria-label={`${schoolName} teacher activity`}
      className="theme-panel p-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-panel-soft text-text-muted">
          <WalletIcon />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold">Today&apos;s Activity</h3>
        </div>
      </div>

      {isLoading && (
        <p className="mt-4 text-sm text-text-muted">Loading activity...</p>
      )}
      {error && (
        <p className="mt-4 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
          {error}
        </p>
      )}
      {!isLoading && !error && (
        <div className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <ActivityMetric
              label="Active Students"
              value={String(balances.length)}
            />
            <ActivityMetric
              label="In Wallets"
              value={formatCurrencyAmount(totalBalance, currencyName)}
            />
          </div>

          {summary && (
            <>
              <ActivityPeriod
                currencyName={currencyName}
                label="Today"
                totals={summary.issuedTotals.today}
              />
              <ActivityPeriod
                currencyName={currencyName}
                label="This Week"
                totals={summary.issuedTotals.thisWeek}
              />
              <YearActivity
                currencyName={currencyName}
                totals={summary.issuedTotals.thisYear}
              />
            </>
          )}
        </div>
      )}
    </section>
  );
}

function ActivityMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border-subtle bg-panel-soft px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
        {label}
      </p>
      <p className="mt-2 break-words text-lg font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function ActivityPeriod({
  currencyName,
  label,
  totals,
}: {
  currencyName: string;
  label: string;
  totals: TeacherIssuedPeriodTotals;
}) {
  return (
    <div className="mt-4 border-t border-border-subtle pt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
        {label}
      </p>
      <div className="mt-3 grid gap-2">
        <ActivityAmount
          amount={totals.given}
          currencyName={currencyName}
          icon={<ArrowUpIcon />}
          label="Given"
          tone="positive"
        />
        <ActivityAmount
          amount={totals.removed}
          currencyName={currencyName}
          icon={<ArrowDownIcon />}
          label="Removed"
          tone="negative"
        />
      </div>
    </div>
  );
}

function YearActivity({
  currencyName,
  totals,
}: {
  currencyName: string;
  totals: TeacherIssuedPeriodTotals;
}) {
  return (
    <div className="mt-4 rounded-md border border-border-subtle bg-panel-soft px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
        Year
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <IssuedAmount
          amount={totals.given}
          currencyName={currencyName}
          icon={<ArrowUpIcon />}
          tone="positive"
        />
        <IssuedAmount
          amount={totals.removed}
          currencyName={currencyName}
          icon={<ArrowDownIcon />}
          tone="negative"
        />
      </div>
    </div>
  );
}

function ActivityAmount({
  amount,
  currencyName,
  icon,
  label,
  tone,
}: {
  amount: number;
  currencyName: string;
  icon: ReactNode;
  label: string;
  tone: "negative" | "positive";
}) {
  const toneClassName =
    tone === "positive" ? "text-success" : "text-danger-strong";

  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2 text-sm text-text-muted">
        <span className={`shrink-0 ${toneClassName}`}>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <span className={`shrink-0 text-sm font-semibold ${toneClassName}`}>
        {formatCurrencyAmount(amount, currencyName)}
      </span>
    </div>
  );
}

function IssuedAmount({
  amount,
  currencyName,
  icon,
  tone,
}: {
  amount: number;
  currencyName: string;
  icon: ReactNode;
  tone: "negative" | "positive";
}) {
  const toneClassName =
    tone === "positive" ? "text-success" : "text-danger-strong";

  return (
    <div className={`flex min-w-0 items-center gap-1.5 ${toneClassName}`}>
      <span className="shrink-0">{icon}</span>
      <span className="truncate text-sm font-semibold">
        {formatCurrencyAmount(amount, currencyName)}
      </span>
    </div>
  );
}
