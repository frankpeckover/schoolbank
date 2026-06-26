"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ShopRequestsPanel } from "@/components/shop/shop-requests-panel";
import { LedgerAdjustmentForm } from "@/components/transactions/ledger-adjustment-form";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  SparkleIcon,
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
      <section className="motion-panel mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <section className="section-highlight theme-panel p-4 sm:p-5">
          <div className="flex h-full min-h-52 flex-col">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
                  <SparkleIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-2xl font-semibold">
                    Adjust {currencyName}
                  </h2>
                </div>
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

        <TeacherSnapshotPanel
          currencyName={currencyName}
          schoolName={schoolName}
        />
      </section>

      <ShopRequestsPanel currencyName={currencyName} />
    </>
  );
}

function TeacherSnapshotPanel({
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

    async function loadSnapshot() {
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
          setError("Could not load snapshot.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSnapshot();

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
      aria-label={`${schoolName} wallet snapshot`}
      className="rounded-md border border-border-subtle bg-surface p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
            <WalletIcon />
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">Wallet Snapshot</h3>
          </div>
        </div>
      </div>

      {isLoading && (
        <p className="mt-4 text-sm text-text-muted">Loading snapshot...</p>
      )}
      {error && (
        <p className="mt-4 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
          {error}
        </p>
      )}
      {!isLoading && !error && (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <SnapshotMetric
              label="Students"
              value={String(balances.length)}
            />
            <SnapshotMetric
              label="In Wallets"
              value={formatCurrencyAmount(totalBalance, currencyName)}
            />
          </div>

          {summary && (
            <TeacherIssuedTotalsCard
              currencyName={currencyName}
              totals={summary.issuedTotals}
            />
          )}
        </div>
      )}
    </section>
  );
}

function SnapshotMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="theme-subpanel p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
        {label}
      </p>
      <p className="mt-2 break-words text-base font-semibold text-foreground xl:text-lg">
        {value}
      </p>
    </div>
  );
}

function TeacherIssuedTotalsCard({
  currencyName,
  totals,
}: {
  currencyName: string;
  totals: TeacherDashboardSummary["issuedTotals"];
}) {
  return (
    <div className="theme-subpanel p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-text-control">
        <SparkleIcon />
        <span>Issued</span>
      </div>
      <div className="mt-3 grid gap-2">
        <TeacherIssuedPeriod
          currencyName={currencyName}
          label="Today"
          totals={totals.today}
        />
        <TeacherIssuedPeriod
          currencyName={currencyName}
          label="Week"
          totals={totals.thisWeek}
        />
        <TeacherIssuedPeriod
          currencyName={currencyName}
          label="Year"
          totals={totals.thisYear}
        />
      </div>
    </div>
  );
}

function TeacherIssuedPeriod({
  currencyName,
  label,
  totals,
}: {
  currencyName: string;
  label: string;
  totals: TeacherIssuedPeriodTotals;
}) {
  return (
    <div className="rounded-md bg-surface px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
        {label}
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
