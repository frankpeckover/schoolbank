import type {
  CreditAnalyticsBalanceHistoryPoint,
  CreditAnalyticsBucket,
  CreditAnalyticsTrendPoint,
} from "@/services/credit-analytics-service";

export type BalanceHistoryValueKey = "averageBalance" | "totalBalance";

export const chartStrokeWidth = 2;
export const activeChartPointRadius = 5;

const maximumAxisTickCount = 5;

export function getBalanceAxisTicks(
  points: CreditAnalyticsBalanceHistoryPoint[],
  valueKey: BalanceHistoryValueKey,
) {
  const maximumBalance = Math.max(...points.map((point) => point[valueKey]), 0);
  return getAxisTicks(maximumBalance);
}

export function getDistributionAxisTicks(buckets: CreditAnalyticsBucket[]) {
  const maximumCount = Math.max(...buckets.map((bucket) => bucket.count), 0);
  return getAxisTicks(maximumCount);
}

export function getPurchaseAxisTicks(trend: CreditAnalyticsTrendPoint[]) {
  const maximumCount = Math.max(
    ...trend.flatMap((point) => [
      point.approvedPurchases,
      point.deniedPurchases,
      point.pendingPurchases,
    ]),
    0,
  );
  return getAxisTicks(maximumCount);
}

export function getTimeAxisTicks(
  points: Array<CreditAnalyticsBalanceHistoryPoint | CreditAnalyticsTrendPoint>,
) {
  if (points.length <= maximumAxisTickCount) {
    return points.map((point) => point.timestamp);
  }

  const lastIndex = points.length - 1;
  const tickIndexes = new Set<number>();

  for (let index = 0; index < maximumAxisTickCount; index += 1) {
    tickIndexes.add(Math.round((index * lastIndex) / (maximumAxisTickCount - 1)));
  }

  return Array.from(tickIndexes)
    .sort((firstIndex, secondIndex) => firstIndex - secondIndex)
    .map((index) => points[index].timestamp);
}

export function findPointLabel(
  points: Array<CreditAnalyticsBalanceHistoryPoint | CreditAnalyticsTrendPoint>,
  timestamp: number,
) {
  return points.find((point) => point.timestamp === timestamp)?.label ?? "";
}

function getAxisTicks(maximumValue: number) {
  const interval = getNiceTickInterval(maximumValue);
  const axisMaximum = Math.max(
    interval,
    Math.ceil(maximumValue / interval) * interval,
  );
  const ticks: number[] = [];

  for (let tick = 0; tick <= axisMaximum; tick += interval) {
    ticks.push(tick);
  }

  return ticks;
}

function getNiceTickInterval(maximumValue: number) {
  if (maximumValue <= 0) {
    return 1;
  }

  const roughInterval = maximumValue / (maximumAxisTickCount - 1);
  const magnitude = 10 ** Math.floor(Math.log10(roughInterval));
  const normalizedInterval = roughInterval / magnitude;

  if (normalizedInterval <= 1) {
    return magnitude;
  }

  if (normalizedInterval <= 2) {
    return 2 * magnitude;
  }

  if (normalizedInterval <= 5) {
    return 5 * magnitude;
  }

  return 10 * magnitude;
}
