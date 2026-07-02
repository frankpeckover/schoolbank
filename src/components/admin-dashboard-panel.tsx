"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
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
import { getSignedAmountTextClassName } from "@/lib/amount-style";
import { EmptyState } from "@/components/ui/empty-state";
import type { AuditLogItem } from "@/services/audit-service";
import type {
  AdminDashboardEntry,
  AdminDashboardSummary,
  AdminSetupChecklistItem,
  TeacherIssuerSummary,
} from "@/services/admin-dashboard-service";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  WalletIcon,
} from "@/components/ui/icons";
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
        <section className="section-highlight theme-panel min-w-0 p-4">
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
            <>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <MetricCard
                  label="Ledger Balance"
                  value={formatWholeNumber(summary.ledgerBalance)}
                />
                <PendingSummaryCard
                  pendingHolds={summary.pendingHolds}
                  pendingShopRequests={summary.pendingShopRequests}
                />
                <AccountSummaryCard
                  disabledAccounts={summary.totalUsers - summary.activeUsers}
                  studentAccounts={summary.studentAccounts}
                  totalAccounts={summary.totalUsers}
                />
              </div>
              <TeacherIssuerPanel
                currencyName={currencyName}
                topCreditIssuers={summary.topCreditIssuers}
                topDemeritIssuers={summary.topDemeritIssuers}
              />
              <SetupChecklist items={summary.setupChecklist} />
            </>
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

      {summary && <RecentAuditActivity entries={summary.recentAuditEntries} />}

      {summary && (
        <RecentLedgerActivity
          currencyName={currencyName}
          entries={summary.recentEntries}
        />
      )}
    </>
  );
}

function SetupChecklist({ items }: { items: AdminSetupChecklistItem[] }) {
  const completedCount = items.filter((item) => item.isComplete).length;

  return (
    <section className="theme-card mt-3 p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Setup Checklist</h3>
        <span className="rounded-full bg-panel-soft px-3 py-1 text-xs font-semibold text-text-muted">
          {completedCount}/{items.length}
        </span>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <article
            className="flex min-w-0 gap-3 rounded-md bg-panel-soft p-3"
            key={item.title}
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                item.isComplete
                  ? "bg-success-soft text-success"
                  : "bg-brand-soft text-brand"
              }`}
            >
              {item.isComplete ? <CheckIcon /> : null}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-1 text-xs text-text-muted">
                {item.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TeacherIssuerPanel({
  currencyName,
  topCreditIssuers,
  topDemeritIssuers,
}: {
  currencyName: string;
  topCreditIssuers: TeacherIssuerSummary[];
  topDemeritIssuers: TeacherIssuerSummary[];
}) {
  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <TeacherIssuerList
        currencyName={currencyName}
        icon={<ArrowUpIcon />}
        issuers={topCreditIssuers}
        title="Top Credit Issuers"
        tone="positive"
      />
      <TeacherIssuerList
        currencyName={currencyName}
        icon={<ArrowDownIcon />}
        issuers={topDemeritIssuers}
        title="Top Demerit Issuers"
        tone="negative"
      />
    </div>
  );
}

function TeacherIssuerList({
  currencyName,
  icon,
  issuers,
  title,
  tone,
}: {
  currencyName: string;
  icon: ReactNode;
  issuers: TeacherIssuerSummary[];
  title: string;
  tone: "negative" | "positive";
}) {
  const toneClassName =
    tone === "positive" ? "text-success" : "text-danger-strong";

  return (
    <article className="theme-card min-w-0 p-3">
      <div className="flex items-center gap-2">
        <span className={`shrink-0 ${toneClassName}`}>{icon}</span>
        <h3 className="truncate text-sm font-semibold">{title}</h3>
      </div>
      {issuers.length === 0 && (
        <div className="mt-3">
          <EmptyState
            description="This will fill in after staff record posted ledger entries."
            icon={icon}
            title="No entries yet"
          />
        </div>
      )}
      {issuers.length > 0 && (
        <ol className="mt-3 grid gap-2">
          {issuers.map((issuer, index) => (
            <li
              className="flex min-w-0 items-center justify-between gap-3 rounded-md bg-panel-soft px-3 py-2"
              key={`${issuer.username}-${index}`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {index + 1}. {issuer.teacherName}
                </p>
                <p className="text-xs text-text-muted">
                  {issuer.entryCount} entries
                </p>
              </div>
              <span className={`shrink-0 text-sm font-semibold ${toneClassName}`}>
                {formatCurrencyAmount(issuer.amount, currencyName)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </article>
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
    <section className="theme-panel flex min-w-0 flex-col p-4">
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
        <div className="flex min-h-48 flex-1 items-center justify-center text-center">
          <EmptyState
            description="The graph will appear after posted or pending ledger activity exists."
            icon={<WalletIcon />}
            title="No circulation history yet"
          />
        </div>
      )}

      {chartPoints.length > 0 && (
        <div className="mt-4 min-h-56 flex-1">
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

function PendingSummaryCard({
  pendingHolds,
  pendingShopRequests,
}: {
  pendingHolds: number;
  pendingShopRequests: number;
}) {
  return (
    <article className="theme-card flex min-h-24 flex-col p-3">
      <p className="text-xs font-semibold uppercase text-text-muted">Pending</p>
      <div className="mt-2 grid flex-1 gap-1">
        <CompactMetricRow
          label="Requests"
          value={pendingShopRequests}
        />
        <CompactMetricRow label="Holds" value={pendingHolds} />
      </div>
    </article>
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

function formatWholeNumber(amount: number) {
  return new Intl.NumberFormat("en-AU").format(amount);
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="theme-card flex min-h-24 flex-col p-3">
      <p className="text-xs font-semibold uppercase text-text-muted">{label}</p>
      <div className="flex flex-1 items-center justify-center text-center">
        <p className="text-3xl font-semibold leading-none tracking-normal text-foreground">
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
    <article className="theme-card flex min-h-24 flex-col p-3">
      <p className="text-xs font-semibold uppercase text-text-muted">
        Accounts
      </p>
      <div className="mt-2 grid flex-1 gap-1">
        <CompactMetricRow label="Total" value={totalAccounts} />
        <CompactMetricRow label="Students" value={studentAccounts} />
        <CompactMetricRow label="Disabled" value={disabledAccounts} />
      </div>
    </article>
  );
}

function CompactMetricRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md bg-panel-soft px-3 py-1.5">
      <p className="truncate text-xs font-semibold uppercase tracking-normal text-text-muted">
        {label}
      </p>
      <p className="shrink-0 text-lg font-semibold leading-none tracking-normal text-foreground">
        {formatWholeNumber(value)}
      </p>
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
          <EmptyState
            description="Recent ledger entries will appear after credits, holds, purchases, or refunds are recorded."
            icon={<WalletIcon />}
            title="No ledger activity yet"
          />
        )}
        {entries.length > 0 && (
          <RecentLedgerList currencyName={currencyName} entries={entries} />
        )}
      </div>
    </section>
  );
}

function RecentAuditActivity({ entries }: { entries: AuditLogItem[] }) {
  return (
    <section className="theme-panel mt-4 min-w-0 p-4">
      <PageHeader title="Recent Audit" titleSize="base" />

      <div className="mt-3 min-w-0">
        {entries.length === 0 && (
          <EmptyState
            description="Administrative changes such as user imports, school settings, and shop updates will appear here."
            title="No audit events yet"
          />
        )}
        {entries.length > 0 && <RecentAuditList entries={entries} />}
      </div>
    </section>
  );
}

function RecentAuditList({ entries }: { entries: AuditLogItem[] }) {
  return (
    <>
      <div className="grid w-full min-w-0 gap-3 md:hidden">
        {entries.map((entry) => (
          <RecentAuditCard entry={entry} key={entry.id} />
        ))}
      </div>

      <div className="hidden w-full min-w-0 max-w-full overflow-x-auto md:block">
        <table className="w-full min-w-[460px] table-fixed border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-text-muted">
              <th className="py-2 pr-4 font-semibold">Time</th>
              <th className="py-2 pr-4 font-semibold">Action</th>
              <th className="py-2 font-semibold">Actor</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr className="border-b border-border-subtle" key={entry.id}>
                <td className="py-2 pr-4 text-text-muted">
                  {formatDateTime(entry.createdAt)}
                </td>
                <td className="break-words py-2 pr-4 font-semibold">
                  {formatAuditLabel(entry.action)}
                </td>
                <td className="py-2 text-text-muted">
                  {formatAuditActor(entry)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function RecentAuditCard({ entry }: { entry: AuditLogItem }) {
  return (
    <article className="theme-card w-full min-w-0 overflow-hidden p-3">
      <h4 className="break-words text-sm font-semibold">
        {formatAuditLabel(entry.action)}
      </h4>
      <p className="mt-1 truncate text-sm text-text-muted">
        {formatAuditActor(entry)}
      </p>
      <p className="mt-2 break-words text-xs text-text-muted">
        {formatDateTime(entry.createdAt)}
      </p>
    </article>
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
                  className={`py-2 text-right font-semibold ${getSignedAmountTextClassName(entry.amount)}`}
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
    getSignedAmountTextClassName(entry.amount);

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

function formatAuditActor(entry: AuditLogItem) {
  if (entry.actorName && entry.actorUsername) {
    return `${entry.actorName} (${entry.actorUsername})`;
  }

  return entry.actorName ?? entry.actorUsername ?? "System";
}

function formatAuditLabel(action: string) {
  return action
    .split(".")
    .map(formatLabelPart)
    .join(" ");
}

function formatLabelPart(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
