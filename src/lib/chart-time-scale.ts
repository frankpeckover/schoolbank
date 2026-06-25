export type ChartTimeScale = "daily" | "weekly" | "monthly";

export type BalanceEvent = {
  amount: number;
  createdAt: string;
};

export type BalanceTimePoint = {
  balance: number;
  dateLabel: string;
  timestamp: number;
  tooltipDate: string;
};

type BuildBalanceTimeSeriesInput = {
  currentBalance?: number;
  events: BalanceEvent[];
  scale: ChartTimeScale;
  startingBalance?: number;
};

const defaultMaximumTimeTicks = 6;
const minimumAxisMaximum = 1;
const preferredBalanceTickCount = 5;
const millisecondsPerDay = 24 * 60 * 60 * 1000;

export const chartTimeScaleOptions: {
  label: string;
  value: ChartTimeScale;
}[] = [
  { label: "Day", value: "daily" },
  { label: "Week", value: "weekly" },
  { label: "Month", value: "monthly" },
];

export function buildBalanceTimeSeries({
  currentBalance,
  events,
  scale,
  startingBalance,
}: BuildBalanceTimeSeriesInput): BalanceTimePoint[] {
  const orderedEvents = [...events].sort(
    (firstEvent, secondEvent) =>
      new Date(firstEvent.createdAt).getTime() -
      new Date(secondEvent.createdAt).getTime(),
  );

  if (orderedEvents.length === 0) {
    return [];
  }

  const firstBucketStart = getBucketStart(
    new Date(orderedEvents[0].createdAt),
    scale,
  );
  const lastBucketStart = getBucketStart(new Date(), scale);
  const openingBalance =
    startingBalance ??
    (currentBalance === undefined
      ? 0
      : currentBalance -
        orderedEvents.reduce((total, event) => total + event.amount, 0));
  let runningBalance = openingBalance;
  let eventIndex = 0;
  const points: BalanceTimePoint[] = [];

  for (
    let bucketStart = firstBucketStart;
    bucketStart.getTime() <= lastBucketStart.getTime();
    bucketStart = addTimeScaleUnit(bucketStart, scale)
  ) {
    const nextBucketStart = addTimeScaleUnit(bucketStart, scale);

    while (
      eventIndex < orderedEvents.length &&
      new Date(orderedEvents[eventIndex].createdAt).getTime() <
        nextBucketStart.getTime()
    ) {
      runningBalance += orderedEvents[eventIndex].amount;
      eventIndex += 1;
    }

    points.push({
      balance: runningBalance,
      dateLabel: formatChartDate(bucketStart, scale),
      timestamp: bucketStart.getTime(),
      tooltipDate: formatChartTooltipDate(bucketStart, scale),
    });
  }

  return points;
}

export function getBalanceAxisTicks(points: BalanceTimePoint[]) {
  const maximumBalance = Math.max(
    minimumAxisMaximum,
    ...points.map((point) => point.balance),
  );
  const tickStep = getNiceTickStep(
    maximumBalance / (preferredBalanceTickCount - 1),
  );
  const axisMaximum = Math.ceil(maximumBalance / tickStep) * tickStep;
  const ticks: number[] = [];

  for (let tick = 0; tick <= axisMaximum; tick += tickStep) {
    ticks.push(tick);
  }

  return ticks;
}

export function getTimeAxisTicks(
  points: BalanceTimePoint[],
  maximumTicks = defaultMaximumTimeTicks,
) {
  if (points.length <= maximumTicks) {
    return points.map((point) => point.timestamp);
  }

  const lastPointIndex = points.length - 1;
  const tickIndexes = new Set<number>();

  for (let tickIndex = 0; tickIndex < maximumTicks; tickIndex += 1) {
    tickIndexes.add(
      Math.round((tickIndex * lastPointIndex) / (maximumTicks - 1)),
    );
  }

  return [...tickIndexes]
    .sort((firstIndex, secondIndex) => firstIndex - secondIndex)
    .map((pointIndex) => points[pointIndex].timestamp);
}

function getBucketStart(date: Date, scale: ChartTimeScale) {
  const bucketStart = new Date(date);
  bucketStart.setHours(0, 0, 0, 0);

  if (scale === "weekly") {
    const mondayOffset = (bucketStart.getDay() + 6) % 7;
    bucketStart.setTime(bucketStart.getTime() - mondayOffset * millisecondsPerDay);
  }

  if (scale === "monthly") {
    bucketStart.setDate(1);
  }

  return bucketStart;
}

function addTimeScaleUnit(date: Date, scale: ChartTimeScale) {
  const nextDate = new Date(date);

  if (scale === "daily") {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  if (scale === "weekly") {
    nextDate.setDate(nextDate.getDate() + 7);
  }

  if (scale === "monthly") {
    nextDate.setMonth(nextDate.getMonth() + 1);
  }

  return nextDate;
}

function getNiceTickStep(rawStep: number) {
  if (rawStep <= 1) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalizedStep = rawStep / magnitude;

  if (normalizedStep <= 1) {
    return magnitude;
  }

  if (normalizedStep <= 2) {
    return 2 * magnitude;
  }

  if (normalizedStep <= 5) {
    return 5 * magnitude;
  }

  return 10 * magnitude;
}

function formatChartDate(date: Date, scale: ChartTimeScale) {
  if (scale === "monthly") {
    return new Intl.DateTimeFormat("en-AU", {
      month: "short",
      year: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatChartTooltipDate(date: Date, scale: ChartTimeScale) {
  if (scale === "weekly") {
    const weekEnd = new Date(date);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return `${formatLongDate(date)} - ${formatLongDate(weekEnd)}`;
  }

  if (scale === "monthly") {
    return new Intl.DateTimeFormat("en-AU", {
      month: "long",
      year: "numeric",
    }).format(date);
  }

  return formatLongDate(date);
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
  }).format(date);
}
