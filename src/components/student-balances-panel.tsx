"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { listStudentBalances } from "@/lib/actions";
import { formatCurrencyAmount } from "@/lib/formatters";
import type { StudentBalanceItem } from "@/services/transaction-service";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterIcon, WalletIcon } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";

type StudentBalancesPanelProps = {
  currencyName: string;
};

export function StudentBalancesPanel({
  currencyName,
}: StudentBalancesPanelProps) {
  const [balances, setBalances] = useState<StudentBalanceItem[]>([]);
  const [search, setSearch] = useState("");
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredBalances = useMemo(
    () =>
      balances
        .filter(
          (student) =>
            student.isActive &&
            matchesStudentSearch(student, search),
        )
        .sort((firstStudent, secondStudent) =>
          secondStudent.balance - firstStudent.balance,
        ),
    [balances, search],
  );

  const totalBalance = filteredBalances.reduce(
    (total, student) => total + student.balance,
    0,
  );
  const averageBalance =
    filteredBalances.length > 0
      ? Math.round(totalBalance / filteredBalances.length)
      : 0;
  const highestBalance = filteredBalances[0]?.balance ?? 0;

  useEffect(() => {
    let isMounted = true;

    async function loadBalances() {
      try {
        const loadedBalances = await listStudentBalances();

        if (isMounted) {
          setBalances(loadedBalances);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load student balances.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadBalances();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <section className="theme-panel motion-panel mt-5 p-4">
        <PageHeader
          icon={<WalletIcon />}
          title="Balances"
          titleSize="base"
        />

        <BalanceSummary
          averageBalance={averageBalance}
          currencyName={currencyName}
          highestBalance={highestBalance}
          studentCount={filteredBalances.length}
          totalBalance={totalBalance}
        />
      </section>

      <section className="theme-panel motion-panel mt-5 min-w-0 p-4">
        <PageHeader
          actions={
            <IconButton
              ariaExpanded={areFiltersOpen}
              label="Toggle balance filters"
              onClick={() => setAreFiltersOpen((isOpen) => !isOpen)}
            >
              <FilterIcon />
            </IconButton>
          }
          title="Students"
          titleSize="base"
        />

        {areFiltersOpen && (
          <BalanceFilters
            onSearchChange={setSearch}
            search={search}
          />
        )}

        <div className="mt-5">
          {isLoading && (
            <p className="text-sm text-text-muted">Loading balances...</p>
          )}
          {error && (
            <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
              {error}
            </p>
          )}
          {!isLoading && !error && filteredBalances.length === 0 && (
            <EmptyState
              description={
                balances.length === 0
                  ? "Student balances will appear after student accounts are created."
                  : "Try changing or clearing the filters to see more students."
              }
              icon={<WalletIcon />}
              title={balances.length === 0 ? "No balances yet" : "No matching balances"}
            />
          )}
          {!isLoading && !error && filteredBalances.length > 0 && (
            <BalancesList
              balances={filteredBalances}
              currencyName={currencyName}
            />
          )}
        </div>
      </section>
    </>
  );
}

function BalanceSummary({
  averageBalance,
  currencyName,
  highestBalance,
  studentCount,
  totalBalance,
}: {
  averageBalance: number;
  currencyName: string;
  highestBalance: number;
  studentCount: number;
  totalBalance: number;
}) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryMetricCard>
        <div className="flex items-center gap-2 text-sm font-semibold text-text-muted">
          <WalletIcon />
          <span>Total held</span>
        </div>
        <p className="mt-2 text-2xl font-semibold">
          {formatCurrencyAmount(totalBalance, currencyName)}
        </p>
      </SummaryMetricCard>
      <SummaryMetricCard>
        <p className="text-sm font-semibold text-text-muted">Students shown</p>
        <p className="mt-2 text-2xl font-semibold">{studentCount}</p>
      </SummaryMetricCard>
      <SummaryMetricCard>
        <p className="text-sm font-semibold text-text-muted">Average balance</p>
        <p className="mt-2 text-2xl font-semibold">
          {formatCurrencyAmount(averageBalance, currencyName)}
        </p>
      </SummaryMetricCard>
      <SummaryMetricCard>
        <p className="text-sm font-semibold text-text-muted">Highest balance</p>
        <p className="mt-2 text-2xl font-semibold">
          {formatCurrencyAmount(highestBalance, currencyName)}
        </p>
      </SummaryMetricCard>
    </div>
  );
}

function SummaryMetricCard({ children }: { children: ReactNode }) {
  return <div className="theme-card p-3">{children}</div>;
}

function BalanceFilters({
  onSearchChange,
  search,
}: {
  onSearchChange: (value: string) => void;
  search: string;
}) {
  return (
    <div className="theme-subpanel mt-4 p-3">
      <div>
        <label
          className="text-sm font-semibold text-text-control"
          htmlFor="balanceSearch"
        >
          Search students
        </label>
        <input
          className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
          id="balanceSearch"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name, username, or email"
          value={search}
        />
      </div>
    </div>
  );
}

function BalancesList({
  balances,
  currencyName,
}: {
  balances: StudentBalanceItem[];
  currencyName: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {balances.map((student) => (
        <BalanceCard
          currencyName={currencyName}
          key={student.id}
          student={student}
        />
      ))}
    </div>
  );
}

function BalanceCard({
  currencyName,
  student,
}: {
  currencyName: string;
  student: StudentBalanceItem;
}) {
  return (
    <article className="theme-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">
            {student.displayName}
          </h3>
          <p className="truncate text-xs text-text-muted">{student.username}</p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-brand">
          {formatCurrencyAmount(student.balance, currencyName)}
        </span>
      </div>
    </article>
  );
}

function matchesStudentSearch(student: StudentBalanceItem, search: string) {
  const query = search.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return [
    student.displayName,
    student.username,
    student.email,
  ].some((value) => value.toLowerCase().includes(query));
}
