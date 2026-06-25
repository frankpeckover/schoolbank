"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAdminDashboardSummary } from "@/lib/actions";
import {
  buildBalanceTimeSeries,
  chartTimeScaleOptions,
  getBalanceAxisTicks,
  getTimeAxisTicks,
  type BalanceTimePoint,
  type ChartTimeScale,
} from "@/lib/chart-time-scale";
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

type CirculationTooltipProps = {
  active?: boolean;
  currencyName: string;
  payload?: { payload: BalanceTimePoint }[];
};

const CHART_POINT_RADIUS = 3;
const ACTIVE_CHART_POINT_RADIUS = 5;
const CHART_STROKE_WIDTH = 3;
const CHART_CURSOR_WIDTH = 2;

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
    <>
      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.9fr)]">
        <section className="theme-panel min-w-0 p-4">
          <PageHeader
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
            <div className="mt-4 grid gap-3 md:grid-cols-2">
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
          )}
        </section>

        {summary && (
          <CirculationChartSection
            currencyName={currencyName}
            entries={summary.circulationEntries}
            ledgerBalance={summary.ledgerBalance}
          />
        )}
      </div>

      {summary && (
        <RecentLedgerActivity
          currencyName={currencyName}
          entries={summary.recentEntries}
        />
      )}
    </>
  );
}

function CirculationChartSection({
  currencyName,
  entries,
  ledgerBalance,
}: {
  currencyName: string;
  entries: AdminDashboardEntry[];
  ledgerBalance: number;
}) {
  const [timeScale, setTimeScale] = useState<ChartTimeScale>("daily");
  const chartPoints = buildCirculationChartPoints(
    entries,
    ledgerBalance,
    timeScale,
  );
  const balanceTicks = getBalanceAxisTicks(chartPoints);
  const timeTicks = getTimeAxisTicks(chartPoints);

  return (
    <section className="theme-panel min-w-0 p-4">
      <PageHeader
        actions={
          <ChartScaleControl
            onScaleChange={setTimeScale}
            selectedScale={timeScale}
          />
        }
        title="Currency in Circulation"
        titleSize="base"
      />

      {chartPoints.length === 0 && (
        <div className="flex min-h-64 items-center justify-center text-center">
          <p className="text-sm text-text-muted">No circulation history yet.</p>
        </div>
      )}

      {chartPoints.length > 0 && (
        <div className="mt-4 h-72 xl:h-[calc(100%-3rem)] xl:min-h-64">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart
              data={chartPoints}
              margin={{ bottom: 0, left: 0, right: 8, top: 8 }}
            >
              <CartesianGrid
                stroke="var(--border-subtle)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                axisLine={false}
                dataKey="timestamp"
                domain={["dataMin", "dataMax"]}
                minTickGap={12}
                tickFormatter={(timestamp) =>
                  findChartPointLabel(chartPoints, Number(timestamp))
                }
                ticks={timeTicks}
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                tickLine={false}
                type="number"
              />
              <YAxis
                axisLine={false}
                domain={[0, balanceTicks[balanceTicks.length - 1]]}
                ticks={balanceTicks}
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                tickLine={false}
                type="number"
                width={40}
              />
              <Tooltip
                content={<CirculationTooltip currencyName={currencyName} />}
                cursor={{
                  stroke: "var(--brand-soft-strong)",
                  strokeWidth: CHART_CURSOR_WIDTH,
                }}
              />
              <Line
                activeDot={{
                  fill: "var(--surface)",
                  r: ACTIVE_CHART_POINT_RADIUS,
                  stroke: "var(--brand)",
                  strokeWidth: CHART_STROKE_WIDTH,
                }}
                dataKey="balance"
                dot={{
                  fill: "var(--surface)",
                  r: CHART_POINT_RADIUS,
                  stroke: "var(--brand)",
                  strokeWidth: CHART_CURSOR_WIDTH,
                }}
                stroke="var(--brand)"
                strokeWidth={CHART_STROKE_WIDTH}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function CirculationTooltip({
  active,
  currencyName,
  payload,
}: CirculationTooltipProps) {
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-text-control">{point.tooltipDate}</p>
      <p className="mt-1 text-brand">
        {formatCurrencyAmount(point.balance, currencyName)}
      </p>
      <p className="mt-1 text-xs font-semibold text-text-muted">
        Total in circulation
      </p>
    </div>
  );
}

function buildCirculationChartPoints(
  entries: AdminDashboardEntry[],
  currentLedgerBalance: number,
  scale: ChartTimeScale,
): BalanceTimePoint[] {
  return buildBalanceTimeSeries({
    currentBalance: currentLedgerBalance,
    events: entries.map((entry) => {
      return {
        amount: entry.amount,
        createdAt: entry.createdAt,
      };
    }),
    scale,
  });
}

function ChartScaleControl({
  onScaleChange,
  selectedScale,
}: {
  onScaleChange: (scale: ChartTimeScale) => void;
  selectedScale: ChartTimeScale;
}) {
  return (
    <div className="inline-flex rounded-md border border-border-subtle bg-panel-soft p-1">
      {chartTimeScaleOptions.map((option) => (
        <button
          className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
            selectedScale === option.value
              ? "bg-surface text-brand shadow-sm"
              : "text-text-muted hover:bg-surface"
          }`}
          key={option.value}
          onClick={() => onScaleChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function findChartPointLabel(points: BalanceTimePoint[], timestamp: number) {
  return (
    points.find((point) => point.timestamp === timestamp)?.dateLabel ?? ""
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
    <section className="theme-panel mt-5 min-w-0 p-4">
      <PageHeader
        title="Recent Ledger Activity"
        titleSize="base"
      />

      <div className="mt-3 min-w-0">
        {entries.length === 0 && (
          <p className="text-sm text-text-muted">No ledger activity yet.</p>
        )}
        {entries.length > 0 && (
          <RecentLedgerList currencyName={currencyName} entries={entries} />
        )}
      </div>
    </section>
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
      <div className="grid w-full min-w-0 gap-3 md:hidden">
        {entries.map((entry) => (
          <RecentLedgerCard
            currencyName={currencyName}
            entry={entry}
            key={`${entry.createdAt}-${entry.studentName}-${entry.amount}`}
          />
        ))}
      </div>

      <div className="hidden w-full min-w-0 max-w-full overflow-x-auto md:block">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm">
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
                <td className="break-words py-2 pr-4 font-semibold">
                  {entry.description}
                </td>
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
      </div>
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
    <article className="theme-card w-full min-w-0 overflow-hidden p-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1 overflow-hidden">
          <h4 className="break-words text-sm font-semibold">
            {entry.description}
          </h4>
          <p className="mt-1 break-words text-sm text-text-muted">
            {entry.studentName}
          </p>
        </div>
        <span className={`shrink-0 text-right text-sm font-semibold ${amountClassName}`}>
          {formatSignedCurrencyAmount(entry.amount, currencyName)}
        </span>
      </div>
      <p className="mt-2 break-words text-xs text-text-muted">
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
