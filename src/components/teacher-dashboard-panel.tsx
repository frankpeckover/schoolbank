"use client";

import { useEffect, useMemo, useState } from "react";
import { ShopRequestsPanel } from "@/components/shop/shop-requests-panel";
import { LedgerAdjustmentForm } from "@/components/transactions/ledger-adjustment-form";
import { SparkleIcon, UsersIcon, WalletIcon } from "@/components/ui/icons";
import { listStudentBalances } from "@/lib/actions";
import { formatCurrencyAmount } from "@/lib/formatters";
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSnapshot() {
      try {
        const loadedBalances = await listStudentBalances();

        if (isMounted) {
          setBalances(loadedBalances.filter((student) => student.isActive));
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

  const topBalances = useMemo(
    () =>
      [...balances]
        .sort((firstStudent, secondStudent) =>
          secondStudent.balance - firstStudent.balance,
        )
        .slice(0, 3),
    [balances],
  );
  const totalBalance = balances.reduce(
    (total, student) => total + student.balance,
    0,
  );
  const highestBalance = topBalances[0]?.balance ?? 0;

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
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <SnapshotMetric
              label="Students"
              value={String(balances.length)}
            />
            <SnapshotMetric
              label="In Wallets"
              value={formatCurrencyAmount(totalBalance, currencyName)}
            />
            <SnapshotMetric
              label="Top Balance"
              value={formatCurrencyAmount(highestBalance, currencyName)}
            />
          </div>

          <TopWalletsList
            currencyName={currencyName}
            students={topBalances}
          />
        </>
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
      <p className="mt-2 break-words text-lg font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function TopWalletsList({
  currencyName,
  students,
}: {
  currencyName: string;
  students: StudentBalanceItem[];
}) {
  return (
    <div className="mt-4 rounded-md border border-border-subtle bg-panel-soft p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-text-control">
        <UsersIcon />
        <span>Top wallets</span>
      </div>
      {students.length === 0 && (
        <p className="mt-3 text-sm text-text-muted">No student balances yet.</p>
      )}
      {students.length > 0 && (
        <div className="mt-3 grid gap-2">
          {students.map((student) => (
            <div
              className="flex items-center justify-between gap-3 rounded-md bg-panel-soft px-3 py-2"
              key={student.id}
            >
              <span className="truncate text-sm font-semibold">
                {student.displayName}
              </span>
              <span className="shrink-0 text-sm font-semibold text-brand">
                {formatCurrencyAmount(student.balance, currencyName)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
