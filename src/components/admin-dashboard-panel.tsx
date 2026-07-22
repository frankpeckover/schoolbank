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
import { formatCurrencyAmount } from "@/lib/formatters";
import { EmptyState } from "@/components/ui/empty-state";
import { FixedNotification } from "@/components/ui/fixed-notification";
import {
  RecentAuditActivity,
  RecentLedgerActivity,
} from "@/components/admin-dashboard/recent-activity";
import type {
  AdminDashboardEntry,
  AdminDashboardSummary,
  TeacherIssuerSummary,
} from "@/services/admin-dashboard-service";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ClockIcon,
  ShoppingBagIcon,
  UserCircleIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { MetricCard } from "@/components/ui/metric-card";
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
      <FixedNotification error={error} />
      <div className="dashboard-grid mt-2">
        <section className="dashboard-unit-2 section-highlight theme-panel min-w-0 p-4">
          {isLoading && (
            <p className="text-sm text-text-muted">Loading overview...</p>
          )}

          {summary && (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <MetricCard
                  icon={<WalletIcon />}
                  label="Ledger Balance"
                  tone="brand"
                  value={formatWholeNumber(summary.ledgerBalance)}
                  variant="centered"
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
              <span className={`shrink-0 text-right text-sm font-semibold ${toneClassName}`}>
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
    <section className="dashboard-unit-2 theme-panel flex min-w-0 flex-col p-4">
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
                dot={false}
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
      <MetricCardHeader
        icon={<ClockIcon />}
        label="Pending"
        tone="accent"
      />
      <div className="mt-2 grid flex-1 gap-1">
        <CompactMetricRow
          label="Requests"
          value={pendingShopRequests}
        />
        <CompactMetricRow
          label="Holds"
          value={pendingHolds}
        />
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
      <MetricCardHeader
        icon={<UserCircleIcon />}
        label="Accounts"
        tone="neutral"
      />
      <div className="mt-2 grid flex-1 gap-1">
        <CompactMetricRow label="Total" value={totalAccounts} />
        <CompactMetricRow
          label="Students"
          value={studentAccounts}
        />
        <CompactMetricRow
          label="Disabled"
          value={disabledAccounts}
        />
      </div>
    </article>
  );
}

function CompactMetricRow({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md bg-panel-soft px-3 py-1.5">
      <div className="flex min-w-0 items-center gap-1.5">
        {icon && <span className="shrink-0 text-text-muted">{icon}</span>}
        <p className="truncate text-xs font-semibold uppercase tracking-normal text-text-muted">
          {label}
        </p>
      </div>
      <p className="shrink-0 text-lg font-semibold tracking-normal text-foreground">
        {formatWholeNumber(value)}
      </p>
    </div>
  );
}

type MetricTone = "accent" | "brand" | "neutral";

function MetricCardHeader({
  icon,
  label,
  tone,
}: {
  icon: ReactNode;
  label: string;
  tone: MetricTone;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${getMetricToneClassName(tone)}`}
      >
        {icon}
      </span>
      <p className="truncate text-xs font-semibold uppercase text-text-muted">
        {label}
      </p>
    </div>
  );
}

function getMetricToneClassName(tone: MetricTone) {
  if (tone === "accent") {
    return "bg-accent-soft text-accent";
  }

  if (tone === "neutral") {
    return "bg-panel-soft text-text-muted";
  }

  return "bg-brand-soft text-brand";
}
