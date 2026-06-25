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
import { StudentShopRequestsPanel } from "@/components/shop/student-shop-requests-panel";
import { TransactionLogPanel } from "@/components/transactions/transaction-log-panel";
import { getStudentBalance, listTransactionLog } from "@/lib/actions";
import {
  buildBalanceTimeSeries,
  chartTimeScaleOptions,
  getBalanceAxisTicks,
  getTimeAxisTicks,
  type BalanceTimePoint,
  type ChartTimeScale,
} from "@/lib/chart-time-scale";
import { formatCurrencyAmount } from "@/lib/formatters";
import type { SessionUser } from "@/lib/session";
import type { TransactionLogItem } from "@/services/transaction-service";

type StudentDashboardPanelProps = {
  currencyName: string;
  currentUser: SessionUser;
  schoolName: string;
};

type BalanceTrendTooltipProps = {
  active?: boolean;
  currencyName: string;
  payload?: { payload: BalanceTimePoint }[];
};

const CHART_POINT_RADIUS = 4;
const ACTIVE_CHART_POINT_RADIUS = 6;
const CHART_STROKE_WIDTH = 3;
const CHART_CURSOR_WIDTH = 2;

export function StudentDashboardPanel({
  currencyName,
  currentUser,
}: StudentDashboardPanelProps) {
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBalance() {
      try {
        const currentBalance = await getStudentBalance();

        if (isMounted) {
          setBalance(currentBalance);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load balance.");
        }
      }
    }

    loadBalance();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <section className="motion-panel mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <StudentWalletCard
          balance={balance}
          currencyName={currencyName}
          currentUser={currentUser}
        />
        <BalanceTrendCard currencyName={currencyName} />

        {error && (
          <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong lg:col-span-2">
            {error}
          </p>
        )}
      </section>

      <StudentShopRequestsPanel
        currencyName={currencyName}
      />

      <TransactionLogPanel
        currencyName={currencyName}
        currentUser={currentUser}
        title="Recent Activity"
      />
    </>
  );
}

function StudentWalletCard({
  balance,
  currencyName,
  currentUser,
}: {
  balance: number;
  currencyName: string;
  currentUser: SessionUser;
}) {
  return (
    <article className="section-highlight wallet-card rounded-3xl border border-brand-soft-strong p-5 text-foreground shadow-sm transition hover:shadow-md sm:p-6">
      <div className="relative flex h-full min-h-52 flex-col items-center justify-center gap-4 text-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-kicker">
            Student Wallet
          </p>
          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
            {currentUser.displayName}
          </h2>
        </div>

        <div>
          <p className="text-sm font-semibold text-text-muted">
            Available balance
          </p>
          <p className="mt-2 break-words text-5xl font-semibold text-brand-ink sm:text-6xl">
            {formatCurrencyAmount(balance, currencyName)}
          </p>
        </div>
      </div>
    </article>
  );
}

function BalanceTrendCard({
  currencyName,
}: {
  currencyName: string;
}) {
  const [transactions, setTransactions] = useState<TransactionLogItem[]>([]);
  const [timeScale, setTimeScale] = useState<ChartTimeScale>("daily");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadTransactions() {
      try {
        const loadedTransactions = await listTransactionLog();

        if (isMounted) {
          setTransactions(loadedTransactions);
        }
      } catch {
        if (isMounted) {
          setTransactions([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTransactions();

    return () => {
      isMounted = false;
    };
  }, []);

  const chartPoints = buildBalanceChartPoints(transactions, timeScale);
  const balanceTicks = getBalanceAxisTicks(chartPoints);
  const timeTicks = getTimeAxisTicks(chartPoints);

  return (
    <article className="flex min-h-52 rounded-3xl border border-border-subtle bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex min-h-56 w-full flex-col rounded-2xl bg-surface">
        <ChartScaleControl
          onScaleChange={setTimeScale}
          selectedScale={timeScale}
        />
        {isLoading && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-text-muted">Loading trend...</p>
          </div>
        )}
        {!isLoading && chartPoints.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-center">
            <p className="text-sm text-text-muted">
              No balance history yet.
            </p>
          </div>
        )}
        {!isLoading && chartPoints.length > 0 && (
          <div className="mt-2 h-56 w-full flex-1">
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
                  content={<BalanceTrendTooltip currencyName={currencyName} />}
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
      </div>
    </article>
  );
}

function BalanceTrendTooltip({
  active,
  currencyName,
  payload,
}: BalanceTrendTooltipProps) {
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
        Balance after transaction
      </p>
    </div>
  );
}

function buildBalanceChartPoints(
  transactions: TransactionLogItem[],
  scale: ChartTimeScale,
): BalanceTimePoint[] {
  const balanceTransactions = transactions.filter(doesTransactionAffectBalance);
  return buildBalanceTimeSeries({
    events: balanceTransactions.map((transaction) => ({
      amount: transaction.amount,
      createdAt: transaction.createdAt,
    })),
    scale,
    startingBalance: 0,
  });
}

function doesTransactionAffectBalance(transaction: TransactionLogItem) {
  return !transaction.isVoided && transaction.entryStatus !== "voided";
}

function ChartScaleControl({
  onScaleChange,
  selectedScale,
}: {
  onScaleChange: (scale: ChartTimeScale) => void;
  selectedScale: ChartTimeScale;
}) {
  return (
    <div className="ml-auto inline-flex rounded-md border border-border-subtle bg-panel-soft p-1">
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
