import type { BalanceHistoryValueKey } from "@/components/credit-analytics/analytics-chart-utils";
import { formatCurrencyAmount } from "@/lib/formatters";
import type {
  CreditAnalyticsBalanceHistoryPoint,
  CreditAnalyticsBucket,
  CreditAnalyticsTrendPoint,
} from "@/services/credit-analytics-service";

type BalanceHistoryTooltipProps = {
  active?: boolean;
  currencyName: string;
  payload?: {
    payload: CreditAnalyticsBalanceHistoryPoint;
  }[];
  valueKey: BalanceHistoryValueKey;
};

type DistributionTooltipProps = {
  active?: boolean;
  payload?: {
    payload: CreditAnalyticsBucket;
  }[];
};

type PurchaseTrendTooltipProps = {
  active?: boolean;
  payload?: {
    color: string;
    name: string;
    payload: CreditAnalyticsTrendPoint;
    value: number;
  }[];
};

export function BalanceHistoryTooltip({
  active,
  currencyName,
  payload,
  valueKey,
}: BalanceHistoryTooltipProps) {
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-text-control">{point.label}</p>
      <p className="mt-1 text-brand">
        {formatCurrencyAmount(point[valueKey], currencyName)}
      </p>
    </div>
  );
}

export function DistributionTooltip({
  active,
  payload,
}: DistributionTooltipProps) {
  const bucket = payload?.[0]?.payload;

  if (!active || !bucket) {
    return null;
  }

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-text-control">{bucket.label}</p>
      <p className="mt-1 text-brand">
        {bucket.count} wallet{bucket.count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function PurchaseTrendTooltip({
  active,
  payload,
}: PurchaseTrendTooltipProps) {
  const point = payload?.[0]?.payload;

  if (!active || !point || !payload) {
    return null;
  }

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-text-control">{point.label}</p>
      <div className="mt-2 space-y-1">
        {payload.map((entry) => (
          <p className="flex items-center gap-2" key={entry.name}>
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-text-muted">{entry.name}</span>
            <span className="font-semibold text-foreground">{entry.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
