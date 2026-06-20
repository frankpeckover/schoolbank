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

type AdminDashboardPanelProps = {
  currencyName: string;
};

export function AdminDashboardPanel({
  currencyName,
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
    <section className="mt-5 rounded-md border border-border bg-surface p-4 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">Admin Overview</h2>
        <p className="mt-1 text-sm text-text-muted">
          System health, account totals, and recent ledger movement.
        </p>
      </div>

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
              value={formatSignedCurrencyAmount(
                summary.ledgerBalance,
                currencyName,
              )}
            />
            <MetricCard
              label="Pending Holds"
              value={formatCurrencyAmount(summary.pendingHolds, currencyName)}
            />
            <MetricCard
              label="Pending Requests"
              value={String(summary.pendingShopRequests)}
            />
            <MetricCard
              label="Student Accounts"
              value={String(summary.studentAccounts)}
            />
            <MetricCard label="Active Users" value={String(summary.activeUsers)} />
            <MetricCard label="Total Users" value={String(summary.totalUsers)} />
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border border-border-subtle bg-panel-soft p-3">
      <p className="text-xs font-semibold uppercase text-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </article>
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
    <article className="rounded-md border border-border-subtle bg-panel-soft p-3">
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
