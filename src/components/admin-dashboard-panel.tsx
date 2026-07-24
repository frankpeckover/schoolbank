"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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
import { InlineSelectMenu } from "@/components/ui/inline-select-menu";
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
  ListIcon,
  UserCircleIcon,
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

const ACTIVE_CHART_POINT_RADIUS = 5;
const CHART_STROKE_WIDTH = 2;
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
        {isLoading && (
          <section className="dashboard-unit-4 theme-panel min-w-0 p-4">
            <p className="text-sm text-text-muted">Loading overview...</p>
          </section>
        )}

        {summary && (
          <>
            <LedgerBalanceCard
              currencyName={currencyName}
              ledgerBalance={summary.ledgerBalance}
            />
            <PendingSummaryCard
              pendingHolds={summary.pendingHolds}
              pendingShopRequests={summary.pendingShopRequests}
            />
            <AccountSummaryCard
              adminAccounts={summary.adminAccounts}
              disabledAccounts={summary.totalUsers - summary.activeUsers}
              staffAccounts={summary.staffAccounts}
              studentAccounts={summary.studentAccounts}
              totalAccounts={summary.totalUsers}
            />
            <SystemSummaryCard
              pendingItems={summary.pendingHolds + summary.pendingShopRequests}
              recentAuditCount={summary.recentAuditEntries.length}
            />
          </>
        )}

        {summary && (
          <>
            <CirculationChartSection
              currencyName={currencyName}
              entries={summary.circulationEntries}
              ledgerBalance={summary.ledgerBalance}
            />
            <TeacherIssuerTile
              currencyName={currencyName}
              icon={<ArrowUpIcon />}
              issuers={summary.topCreditIssuers}
              title="Top Credit Issuers"
              tone="positive"
            />
            <TeacherIssuerTile
              currencyName={currencyName}
              icon={<ArrowDownIcon />}
              issuers={summary.topDemeritIssuers}
              title="Top Demerit Issuers"
              tone="negative"
            />
          </>
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

function LedgerBalanceCard({
  currencyName,
  ledgerBalance,
}: {
  currencyName: string;
  ledgerBalance: number;
}) {
  return (
    <section className="dashboard-unit-1 theme-panel flex min-h-36 min-w-0 flex-col p-4">
      <MetricCardHeader
        icon={<WalletIcon />}
        label="Ledger Balance"
        tone="brand"
      />
      <div className="flex flex-1 flex-col justify-end">
        <p className="truncate text-4xl font-semibold tracking-normal text-foreground">
          {formatWholeNumber(ledgerBalance)}
        </p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-normal text-text-muted">
          {currencyName}
        </p>
      </div>
    </section>
  );
}

function SystemSummaryCard({
  pendingItems,
  recentAuditCount,
}: {
  pendingItems: number;
  recentAuditCount: number;
}) {
  return (
    <section className="dashboard-unit-1 theme-panel flex min-h-36 flex-col p-4">
      <MetricCardHeader
        icon={<ListIcon />}
        label="System Snapshot"
        tone="neutral"
      />
      <div className="mt-2 grid flex-1 gap-1">
        <CompactMetricRow label="Admin changes" value={recentAuditCount} />
        <CompactMetricRow label="Pending items" value={pendingItems} />
      </div>
    </section>
  );
}

function TeacherIssuerTile({
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
    <section className="dashboard-unit-1 theme-panel min-w-0 p-4">
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
              className="flex min-w-0 items-center justify-between gap-3 py-1.5"
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
    </section>
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
            <AreaChart
              data={chartPoints}
              margin={{ bottom: 0, left: 0, right: 8, top: 8 }}
            >
              <defs>
                <linearGradient id="adminCirculationFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
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
              <Area
                activeDot={{
                  fill: "var(--surface)",
                  r: ACTIVE_CHART_POINT_RADIUS,
                  stroke: "var(--brand)",
                  strokeWidth: CHART_STROKE_WIDTH,
                }}
                dataKey="balance"
                fill="url(#adminCirculationFill)"
                fillOpacity={1}
                stroke="var(--brand)"
                strokeWidth={CHART_STROKE_WIDTH}
                type="monotone"
              />
            </AreaChart>
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
    <section className="dashboard-unit-1 theme-panel flex min-h-36 flex-col p-4">
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
    <InlineSelectMenu
      ariaLabel="Change circulation graph scale"
      onChange={onScaleChange}
      options={chartTimeScaleOptions}
      value={selectedScale}
    />
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
  adminAccounts,
  disabledAccounts,
  staffAccounts,
  studentAccounts,
  totalAccounts,
}: {
  adminAccounts: number;
  disabledAccounts: number;
  staffAccounts: number;
  studentAccounts: number;
  totalAccounts: number;
}) {
  const accountSegments = [
    { color: "var(--brand)", label: "Students", value: studentAccounts },
    { color: "var(--accent)", label: "Staff", value: staffAccounts },
    { color: "var(--success)", label: "Admins", value: adminAccounts },
  ].filter((segment) => segment.value > 0);

  return (
    <section className="dashboard-unit-1 theme-panel flex min-h-36 flex-col p-4">
      <MetricCardHeader
        icon={<UserCircleIcon />}
        label="Accounts"
        tone="neutral"
      />
      <div className="mt-2 grid flex-1 grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3">
        <AccountDonut segments={accountSegments} totalAccounts={totalAccounts} />
        <div className="grid gap-1">
          <AccountLegend color="var(--brand)" label="Students" value={studentAccounts} />
          <AccountLegend color="var(--accent)" label="Staff" value={staffAccounts} />
          <AccountLegend color="var(--success)" label="Admins" value={adminAccounts} />
          <AccountLegend color="var(--danger)" label="Disabled" value={disabledAccounts} />
        </div>
      </div>
    </section>
  );
}

type AccountSegment = {
  color: string;
  label: string;
  value: number;
};

function AccountDonut({
  segments,
  totalAccounts,
}: {
  segments: AccountSegment[];
  totalAccounts: number;
}) {
  if (segments.length === 0) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-panel-soft text-sm font-semibold text-text-muted">
        0
      </div>
    );
  }

  return (
    <div className="relative h-20 w-20">
      <ResponsiveContainer height="100%" width="100%">
        <PieChart>
          <Pie
            data={segments}
            dataKey="value"
            innerRadius="64%"
            isAnimationActive={false}
            outerRadius="94%"
            paddingAngle={2}
            stroke="var(--surface)"
            strokeWidth={2}
          >
            {segments.map((segment) => (
              <Cell fill={segment.color} key={segment.label} />
            ))}
          </Pie>
          <Tooltip
            content={<AccountDonutTooltip />}
            wrapperStyle={{ zIndex: 50 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center text-lg font-semibold text-foreground">
        {formatWholeNumber(totalAccounts)}
      </div>
    </div>
  );
}

function AccountDonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: AccountSegment }[];
}) {
  const segment = payload?.[0]?.payload;

  if (!active || !segment) {
    return null;
  }

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-text-control">{segment.label}</p>
      <p className="mt-1 text-text-muted">{formatWholeNumber(segment.value)}</p>
    </div>
  );
}

function AccountLegend({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 text-xs">
      <span className="flex min-w-0 items-center gap-1.5 text-text-muted">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: color }}
        />
        <span className="truncate">{label}</span>
      </span>
      <span className="font-semibold text-foreground">{formatWholeNumber(value)}</span>
    </div>
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
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border-muted px-1 py-1.5 last:border-b-0">
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
