"use client";

import { useEffect, useState } from "react";
import { listTransactionLog } from "@/lib/actions";
import type { SessionUser } from "@/lib/session";
import type { TransactionLogItem } from "@/services/transaction-service";

type TransactionLogPanelProps = {
  currencyName: string;
  currentUser: SessionUser;
};

type TransactionFilters = {
  amountDirection: "" | "positive" | "negative";
  reason: string;
  student: string;
  type: "" | TransactionLogItem["type"];
};

const emptyTransactionFilters: TransactionFilters = {
  amountDirection: "",
  reason: "",
  student: "",
  type: "",
};

export function TransactionLogPanel({
  currencyName,
  currentUser,
}: TransactionLogPanelProps) {
  const canViewAllTransactions =
    currentUser.role === "admin" || currentUser.role === "teacher";
  const [transactions, setTransactions] = useState<TransactionLogItem[]>([]);
  const [filters, setFilters] = useState<TransactionFilters>(
    emptyTransactionFilters,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTransactions() {
      try {
        const loadedTransactions = await listTransactionLog(currentUser);

        if (isMounted) {
          setTransactions(loadedTransactions);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load transactions.");
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
  }, [currentUser]);

  const filteredTransactions = transactions.filter((transaction) =>
    matchesTransactionFilters(transaction, filters),
  );

  return (
    <section className="mt-5 rounded-md border border-border bg-surface p-5 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold">Transaction Log</h2>
        <p className="mt-1 text-sm text-text-muted">
          {canViewAllTransactions
            ? "Showing all recorded transactions."
            : "Showing your recorded transactions."}
        </p>
      </div>

      <TransactionFilters
        canViewAllTransactions={canViewAllTransactions}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <div className="mt-5 overflow-x-auto">
        {isLoading && (
          <p className="text-sm text-text-muted">Loading transactions...</p>
        )}
        {error && (
          <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
            {error}
          </p>
        )}
        {!isLoading && !error && transactions.length === 0 && (
          <p className="text-sm text-text-muted">No transactions recorded yet.</p>
        )}
        {!isLoading && !error && transactions.length > 0 && filteredTransactions.length === 0 && (
          <p className="text-sm text-text-muted">
            No transactions match these filters.
          </p>
        )}
        {!isLoading && !error && filteredTransactions.length > 0 && (
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-text-muted">
                <th className="py-3 pr-4 font-semibold">Date</th>
                <th className="py-3 pr-4 font-semibold">Type</th>
                <th className="py-3 pr-4 font-semibold">Reason</th>
                {canViewAllTransactions && (
                  <th className="py-3 pr-4 font-semibold">User</th>
                )}
                <th className="py-3 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr
                  className="border-b border-border-subtle"
                  key={transaction.id}
                >
                  <td className="py-3 pr-4 text-text-muted">
                    {formatTransactionDate(transaction.createdAt)}
                  </td>
                  <td className="py-3 pr-4 font-semibold">
                    {transaction.description}
                  </td>
                  <td className="py-3 pr-4 text-text-muted">
                    {transaction.reason}
                  </td>
                  {canViewAllTransactions && (
                    <td className="py-3 pr-4 text-text-muted">
                      {transaction.studentName}
                      <span className="block text-xs">
                        {transaction.studentUsername}
                      </span>
                    </td>
                  )}
                  <td
                    className={`py-3 font-semibold ${
                      transaction.amount >= 0 ? "text-success" : "text-danger-strong"
                    }`}
                  >
                    {formatPointAmount(transaction.amount, currencyName)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function TransactionFilters({
  canViewAllTransactions,
  filters,
  onFiltersChange,
}: {
  canViewAllTransactions: boolean;
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
}) {
  function updateFilter<Field extends keyof TransactionFilters>(
    field: Field,
    value: TransactionFilters[Field],
  ) {
    onFiltersChange({ ...filters, [field]: value });
  }

  return (
    <div className="mt-5 rounded-md border border-border-subtle bg-panel-soft p-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="text-sm font-semibold text-text-control" htmlFor="transactionType">
            Type
          </label>
          <select
            className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
            id="transactionType"
            onChange={(event) =>
              updateFilter(
                "type",
                event.target.value as TransactionFilters["type"],
              )
            }
            value={filters.type}
          >
            <option value="">Any type</option>
            <option value="point_adjustment">Point adjustment</option>
            <option value="shop_purchase">Shop purchase</option>
          </select>
        </div>

        <FilterInput
          id="transactionReason"
          label="Reason"
          onChange={(value) => updateFilter("reason", value)}
          value={filters.reason}
        />

        {canViewAllTransactions && (
          <FilterInput
            id="transactionStudent"
            label="Student"
            onChange={(value) => updateFilter("student", value)}
            value={filters.student}
          />
        )}

        <div>
          <label className="text-sm font-semibold text-text-control" htmlFor="amountDirection">
            Amount
          </label>
          <select
            className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
            id="amountDirection"
            onChange={(event) =>
              updateFilter(
                "amountDirection",
                event.target.value as TransactionFilters["amountDirection"],
              )
            }
            value={filters.amountDirection}
          >
            <option value="">Any amount</option>
            <option value="positive">Added</option>
            <option value="negative">Removed/spent</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function FilterInput({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-text-control" htmlFor={id}>
        {label}
      </label>
      <input
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </div>
  );
}

function formatTransactionDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPointAmount(amount: number, currencyName: string) {
  return `${amount > 0 ? "+" : ""}${amount} ${currencyName}`;
}

function matchesTransactionFilters(
  transaction: TransactionLogItem,
  filters: TransactionFilters,
) {
  return (
    (!filters.type || transaction.type === filters.type) &&
    matchesAmountDirection(transaction.amount, filters.amountDirection) &&
    includesFilter(transaction.reason, filters.reason) &&
    includesFilter(
      `${transaction.studentName} ${transaction.studentUsername}`,
      filters.student,
    )
  );
}

function matchesAmountDirection(
  amount: number,
  direction: TransactionFilters["amountDirection"],
) {
  if (direction === "positive") {
    return amount > 0;
  }

  if (direction === "negative") {
    return amount < 0;
  }

  return true;
}

function includesFilter(value: string, filter: string) {
  return value.toLowerCase().includes(filter.trim().toLowerCase());
}
