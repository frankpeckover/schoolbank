"use client";

import { useEffect, useState } from "react";
import { getAdminDashboardSummary } from "@/lib/actions";
import {
  formatCurrencyAmount,
  formatDateTime,
  formatSignedCurrencyAmount,
} from "@/lib/formatters";
import type {
  AdminDashboardEntry,
  AdminDashboardSummary,
} from "@/services/admin-dashboard-service";
import { WalletIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";

type AdminDashboardPanelProps = {
  currencyName: string;
  schoolName: string;
};

export function AdminDashboardPanel({
  currencyName,
  schoolName,
}: AdminDashboardPanelProps) {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      try {
        const loadedSummary = await getAdminDashboardSummary();

        if (isMounted) {
          setSummary(loadedSummary);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load admin dashboard.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="theme-panel mt-5 p-4">
      <PageHeader
        description={`${schoolName} totals and recent movement.`}
        icon={<WalletIcon />}
        title="Admin Overview"
        titleSize="base"
      />

      {isLoading && (
        <p className="mt-4 text-sm text-text-muted">Loading overview...</p>
      )}
      {error && (
        <p className="mt-4 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
          {error}
        </p>
      )}

      {summary && (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Ledger Balance"
              value={formatBalanceAmount(summary.ledgerBalance, currencyName)}
            />
            <MetricCard
              label="Pending Holds"
              value={formatCurrencyAmount(summary.pendingHolds, currencyName)}
            />
            <MetricCard
              label="Pending Requests"
              value={String(summary.pendingShopRequests)}
            />
            <AccountSummaryCard
              disabledAccounts={summary.totalUsers - summary.activeUsers}
              studentAccounts={summary.studentAccounts}
              totalAccounts={summary.totalUsers}
            />
          </div>

          <RecentLedgerActivity
            currencyName={currencyName}
            entries={summary.recentEntries}
          />
        </>
      )}
    </section>
  );
}

function formatBalanceAmount(amount: number, currencyName: string) {
  return amount < 0
    ? `-${formatCurrencyAmount(amount, currencyName)}`
    : formatCurrencyAmount(amount, currencyName);
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="theme-card flex min-h-28 flex-col p-3">
      <p className="text-xs font-semibold uppercase text-text-muted">{label}</p>
      <div className="flex flex-1 items-center justify-center text-center">
        <p className="break-words text-2xl font-semibold text-foreground">
          {value}
        </p>
      </div>
    </article>
  );
}

function AccountSummaryCard({
  disabledAccounts,
  studentAccounts,
  totalAccounts,
}: {
  disabledAccounts: number;
  studentAccounts: number;
  totalAccounts: number;
}) {
  return (
    <article className="theme-card flex min-h-28 flex-col p-3">
      <p className="text-xs font-semibold uppercase text-text-muted">
        Accounts
      </p>
      <div className="grid flex-1 grid-cols-3 items-center gap-2 text-center">
        <AccountSummaryMetric label="Total" value={totalAccounts} />
        <AccountSummaryMetric label="Students" value={studentAccounts} />
        <AccountSummaryMetric label="Disabled" value={disabledAccounts} />
      </div>
    </article>
  );
}

function AccountSummaryMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs font-semibold text-text-muted">{label}</p>
    </div>
  );
}

function RecentLedgerActivity({
  currencyName,
  entries,
}: {
  currencyName: string;
  entries: AdminDashboardEntry[];
}) {
  return (
    <div className="mt-5">
      <h3 className="text-lg font-semibold">Recent Ledger Activity</h3>

      <div className="mt-3">
        {entries.length === 0 && (
          <p className="text-sm text-text-muted">No ledger activity yet.</p>
        )}
        {entries.length > 0 && (
          <RecentLedgerList currencyName={currencyName} entries={entries} />
        )}
      </div>
    </div>
  );
}

function RecentLedgerList({
  currencyName,
  entries,
}: {
  currencyName: string;
  entries: AdminDashboardEntry[];
}) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {entries.map((entry) => (
          <RecentLedgerCard
            currencyName={currencyName}
            entry={entry}
            key={`${entry.createdAt}-${entry.studentName}-${entry.amount}`}
          />
        ))}
      </div>

      <table className="hidden w-full border-collapse text-left text-sm md:table">
        <thead>
          <tr className="border-b border-border-subtle text-text-muted">
            <th className="py-2 pr-4 font-semibold">Date</th>
            <th className="py-2 pr-4 font-semibold">Account</th>
            <th className="py-2 pr-4 font-semibold">Description</th>
            <th className="py-2 pr-4 font-semibold">Type</th>
            <th className="py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              className="border-b border-border-subtle"
              key={`${entry.createdAt}-${entry.studentName}-${entry.amount}`}
            >
              <td className="py-2 pr-4 text-text-muted">
                {formatDateTime(entry.createdAt)}
              </td>
              <td className="py-2 pr-4 text-text-muted">
                {entry.studentName}
              </td>
              <td className="py-2 pr-4 font-semibold">{entry.description}</td>
              <td className="py-2 pr-4 text-text-muted">
                {formatEntryType(entry.type)}
              </td>
              <td
                className={`py-2 text-right font-semibold ${
                  entry.amount >= 0 ? "text-success" : "text-danger-strong"
                }`}
              >
                {formatSignedCurrencyAmount(entry.amount, currencyName)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function RecentLedgerCard({
  currencyName,
  entry,
}: {
  currencyName: string;
  entry: AdminDashboardEntry;
}) {
  const amountClassName =
    entry.amount >= 0 ? "text-success" : "text-danger-strong";

  return (
    <article className="theme-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold">
            {entry.description}
          </h4>
          <p className="truncate text-sm text-text-muted">
            {entry.studentName}
          </p>
        </div>
        <span className={`text-sm font-semibold ${amountClassName}`}>
          {formatSignedCurrencyAmount(entry.amount, currencyName)}
        </span>
      </div>
      <p className="mt-2 text-xs text-text-muted">
        {formatEntryType(entry.type)} - {formatDateTime(entry.createdAt)}
      </p>
    </article>
  );
}

function formatEntryType(type: AdminDashboardEntry["type"]) {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
