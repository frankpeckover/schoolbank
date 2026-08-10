"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  MinusIcon,
} from "@/components/ui/icons";
import { CreditActionControl } from "@/components/ui/credit-action-control";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatAmount } from "@/lib/formatters";

export type StudentBalanceCardStudent = {
  balance: number;
  displayName: string;
  id: string;
  profileImageUrl?: string;
  recentChange?: number;
  username: string;
};

type StudentBalanceCardProps = {
  currencyName: string;
  onAdd?: (student: StudentBalanceCardStudent) => void;
  onRemove?: (student: StudentBalanceCardStudent) => void;
  student: StudentBalanceCardStudent;
};

export function StudentBalanceCard({
  currencyName,
  onAdd,
  onRemove,
  student,
}: StudentBalanceCardProps) {
  const hasActions = Boolean(onAdd || onRemove);

  return (
    <article className="theme-card p-3">
      <div className="flex items-center gap-3">
        <UserAvatar
          displayName={student.displayName}
          imageUrl={student.profileImageUrl}
          size="lg"
          tone="neutral"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {student.displayName}
          </h3>
          <RecentTrend amount={student.recentChange ?? 0} />
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <BalanceAmount
          amount={student.balance}
          currencyName={currencyName}
        />

        {hasActions && (
          <CreditActionControl
            addAriaLabel={`Add ${currencyName} to ${student.displayName}`}
            onAdd={onAdd ? () => onAdd(student) : undefined}
            onRemove={onRemove ? () => onRemove(student) : undefined}
            removeAriaLabel={`Remove ${currencyName} from ${student.displayName}`}
          />
        )}
      </div>
    </article>
  );
}

function RecentTrend({ amount }: { amount: number }) {
  const isPositive = amount > 0;
  const isNegative = amount < 0;
  const Icon = isPositive ? ArrowUpIcon : isNegative ? ArrowDownIcon : MinusIcon;
  const textClassName = isPositive
    ? "text-success"
    : isNegative
      ? "text-danger"
      : "text-text-muted";
  const trendLabel = isPositive
    ? "Trending up over the last 7 days"
    : isNegative
      ? "Trending down over the last 7 days"
      : "No recent movement over the last 7 days";

  return (
    <p
      className={`mt-0.5 flex items-center gap-1 truncate text-xs font-medium ${textClassName}`}
      title={trendLabel}
    >
      <span className="text-text-muted">Recent:</span>
      <Icon className="h-3 w-3 shrink-0" />
    </p>
  );
}

function BalanceAmount({
  amount,
  currencyName,
}: {
  amount: number;
  currencyName: string;
}) {
  return (
    <p className="flex min-w-0 flex-col text-left text-brand">
      <span className="font-number text-2xl font-semibold leading-none">
        {formatAmount(amount)}
      </span>
      <span className="mt-0.5 text-xs font-semibold text-text-muted">
        {currencyName}
      </span>
    </p>
  );
}
