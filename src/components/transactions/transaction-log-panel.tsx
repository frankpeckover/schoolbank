"use client";

import { useEffect, useState } from "react";
import { listTransactionLog, voidTransaction } from "@/lib/actions";
import type { SessionUser } from "@/lib/session";
import type { TransactionLogItem } from "@/services/transaction-service";
import { formatCurrencyAmount, formatDateTime } from "@/lib/formatters";
import {
  StatusBadge,
  type StatusTone,
} from "@/components/ui/status-badge";
import { TextReasonModal } from "@/components/ui/text-reason-modal";

type TransactionLogPanelProps = {
  currencyName: string;
  currentUser: SessionUser;
};

type TransactionFilters = {
  amountDirection: "" | "positive" | "negative";
  purchaseStatus: "" | "pending" | "approved" | "denied";
  reason: string;
  student: string;
  type: "" | TransactionLogItem["type"];
  voidedStatus: "" | "active" | "voided";
};

const emptyTransactionFilters: TransactionFilters = {
  amountDirection: "",
  purchaseStatus: "",
  reason: "",
  student: "",
  type: "",
  voidedStatus: "active",
};

export function TransactionLogPanel({
  currencyName,
  currentUser,
}: TransactionLogPanelProps) {
  const canViewAllTransactions =
    currentUser.role === "admin" || currentUser.role === "teacher";
  const canVoidTransactions = currentUser.role === "admin";
  const [transactions, setTransactions] = useState<TransactionLogItem[]>([]);
  const [filters, setFilters] = useState<TransactionFilters>(
    emptyTransactionFilters,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [viewingTransaction, setViewingTransaction] =
    useState<TransactionLogItem | null>(null);
  const [voidingTransaction, setVoidingTransaction] =
    useState<TransactionLogItem | null>(null);

  async function refreshTransactions() {
    setIsLoading(true);

    try {
      const loadedTransactions = await listTransactionLog(currentUser);
      setTransactions(loadedTransactions);
      setError(null);
    } catch {
      setError("Could not load transactions.");
    } finally {
      setIsLoading(false);
    }
  }

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

  async function handleVoidTransaction(reason: string) {
    if (!voidingTransaction) {
      return;
    }
    setError(null);
    setMessage(null);

    const result = await voidTransaction(
      currentUser,
      voidingTransaction.id,
      reason,
    );

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setVoidingTransaction(null);
    setMessage("Transaction voided.");
    refreshTransactions();
  }

  const filteredTransactions = transactions.filter((transaction) =>
    matchesTransactionFilters(transaction, filters),
  );

  return (
    <section className="mt-5 rounded-md border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Transaction Log</h2>
          <p className="mt-1 text-sm text-text-muted">
            {canViewAllTransactions
              ? "Showing all recorded transactions."
              : "Showing your recorded transactions."}
          </p>
        </div>
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
        {message && (
          <p className="mb-4 rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-semibold text-success">
            {message}
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
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-text-muted">
                <th className="py-2 pr-4 font-semibold">Date</th>
                <th className="py-2 pr-4 font-semibold">Description</th>
                {canViewAllTransactions && (
                  <th className="py-2 pr-4 font-semibold">Account</th>
                )}
                <th className="py-2 pr-4 font-semibold">Status</th>
                <th className="py-2 pr-4 text-right font-semibold">Money In</th>
                <th className="py-2 pr-4 text-right font-semibold">Money Out</th>
                <th className="py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr
                  className="border-b border-border-subtle"
                  key={transaction.id}
                >
                  <td className="py-2 pr-4 text-text-muted">
                    {formatDateTime(transaction.createdAt)}
                  </td>
                  <td className="py-2 pr-4">
                    <span className="font-semibold">{transaction.reason}</span>
                    <span className="block text-xs text-text-muted">
                      {transaction.description}
                    </span>
                  </td>
                  {canViewAllTransactions && (
                    <td className="py-2 pr-4 text-text-muted">
                      {transaction.studentName}
                      <span className="block text-xs">
                        {transaction.studentUsername}
                      </span>
                    </td>
                  )}
                  <td className="py-2 pr-4">
                    <TransactionStatusBadge transaction={transaction} />
                  </td>
                  <td className="py-2 pr-4 text-right font-semibold text-success">
                    {transaction.amount > 0
                      ? formatCurrencyAmount(transaction.amount, currencyName)
                      : ""}
                  </td>
                  <td className="py-2 pr-4 text-right font-semibold text-danger-strong">
                    {transaction.amount < 0
                      ? formatCurrencyAmount(transaction.amount, currencyName)
                      : ""}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        className="rounded-md border border-button-border px-3 py-2 text-sm font-semibold text-text-control transition hover:bg-surface"
                        onClick={() => setViewingTransaction(transaction)}
                        type="button"
                      >
                        Details
                      </button>
                      {canVoidTransactions && (
                        <button
                          className="rounded-md border border-button-border px-3 py-2 text-sm font-semibold text-text-control transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={
                            transaction.isVoided ||
                            transaction.type === "void_reversal"
                          }
                          onClick={() => setVoidingTransaction(transaction)}
                          type="button"
                        >
                          Void
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {voidingTransaction && (
        <TextReasonModal
          confirmLabel="Void Transaction"
          description="Voiding keeps the original entry and adds a reversal where needed."
          isRequired
          onCancel={() => setVoidingTransaction(null)}
          onConfirm={handleVoidTransaction}
          title="Void Transaction"
        />
      )}

      {viewingTransaction && (
        <TransactionDetailsModal
          currencyName={currencyName}
          onClose={() => setViewingTransaction(null)}
          transaction={viewingTransaction}
        />
      )}
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
    <div className="mt-4 rounded-md border border-border-subtle bg-panel-soft p-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div>
          <label className="text-sm font-semibold text-text-control" htmlFor="transactionType">
            Type
          </label>
          <select
            className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none ring-brand transition focus:ring-2"
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
            <option value="reward">Reward</option>
            <option value="penalty">Penalty</option>
            <option value="shop_hold">Shop hold</option>
            <option value="shop_purchase">Shop purchase</option>
            <option value="shop_refund">Shop refund</option>
            <option value="manual_adjustment">Manual adjustment</option>
            <option value="void_reversal">Void reversal</option>
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
            className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none ring-brand transition focus:ring-2"
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

        <div>
          <label className="text-sm font-semibold text-text-control" htmlFor="voidedStatus">
            Void status
          </label>
          <select
            className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none ring-brand transition focus:ring-2"
            id="voidedStatus"
            onChange={(event) =>
              updateFilter(
                "voidedStatus",
                event.target.value as TransactionFilters["voidedStatus"],
              )
            }
            value={filters.voidedStatus}
          >
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="voided">Voided</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-text-control" htmlFor="purchaseStatus">
            Purchase status
          </label>
          <select
            className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none ring-brand transition focus:ring-2"
            id="purchaseStatus"
            onChange={(event) =>
              updateFilter(
                "purchaseStatus",
                event.target.value as TransactionFilters["purchaseStatus"],
              )
            }
            value={filters.purchaseStatus}
          >
            <option value="">Any purchase status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function TransactionStatusBadge({
  transaction,
}: {
  transaction: TransactionLogItem;
}) {
  const label = getTransactionStatusLabel(transaction);
  return (
    <StatusBadge label={label} tone={getTransactionStatusTone(transaction)} />
  );
}

function TransactionDetailsModal({
  currencyName,
  onClose,
  transaction,
}: {
  currencyName: string;
  onClose: () => void;
  transaction: TransactionLogItem;
}) {
  const amountLabel =
    transaction.amount >= 0
      ? formatCurrencyAmount(transaction.amount, currencyName)
      : `-${formatCurrencyAmount(transaction.amount, currencyName)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
      <div className="w-full max-w-lg rounded-md border border-border bg-surface p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">Transaction Details</h3>
            <p className="mt-1 text-sm text-text-muted">
              {formatDateTime(transaction.createdAt)}
            </p>
          </div>
          <TransactionStatusBadge transaction={transaction} />
        </div>

        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <TransactionDetail label="Description" value={transaction.reason} />
          <TransactionDetail label="Type" value={transaction.description} />
          <TransactionDetail label="Amount" value={amountLabel} />
          <TransactionDetail label="Account" value={transaction.studentName} />
          <TransactionDetail
            label="Username"
            value={transaction.studentUsername}
          />
          <TransactionDetail
            label="Purchase status"
            value={transaction.purchaseStatus ?? "-"}
          />
          <TransactionDetail
            label="Voided at"
            value={
              transaction.voidedAt ? formatDateTime(transaction.voidedAt) : "-"
            }
          />
        </dl>

        <div className="mt-5 flex justify-end">
          <button
            className="rounded-md border border-button-border px-4 py-2 text-sm font-semibold text-text-control transition hover:bg-surface-hover"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function TransactionDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-text-muted">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-text-control">{value}</dd>
    </div>
  );
}

function getTransactionStatusLabel(transaction: TransactionLogItem) {
  if (transaction.isVoided) {
    return "Voided";
  }

  if (transaction.entryStatus === "pending") {
    return "Pending";
  }

  if (transaction.purchaseStatus === "pending") {
    return "Pending";
  }

  if (transaction.purchaseStatus === "approved") {
    return "Approved";
  }

  if (transaction.purchaseStatus === "denied") {
    return "Denied";
  }

  return "Active";
}

function getTransactionStatusTone(transaction: TransactionLogItem): StatusTone {
  if (transaction.isVoided || transaction.purchaseStatus === "denied") {
    return "danger";
  }

  if (transaction.entryStatus === "pending") {
    return "warning";
  }

  if (transaction.type === "void_reversal") {
    return "neutral";
  }

  return "success";
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
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none ring-brand transition focus:ring-2"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </div>
  );
}

function matchesTransactionFilters(
  transaction: TransactionLogItem,
  filters: TransactionFilters,
) {
  return (
    (!filters.type || transaction.type === filters.type) &&
    matchesVoidedStatus(transaction.isVoided, filters.voidedStatus) &&
    matchesPurchaseStatus(transaction.purchaseStatus, filters.purchaseStatus) &&
    matchesAmountDirection(transaction.amount, filters.amountDirection) &&
    includesFilter(transaction.reason, filters.reason) &&
    includesFilter(
      `${transaction.studentName} ${transaction.studentUsername}`,
      filters.student,
    )
  );
}

function matchesPurchaseStatus(
  purchaseStatus: TransactionLogItem["purchaseStatus"],
  filter: TransactionFilters["purchaseStatus"],
) {
  if (!filter) {
    return true;
  }

  return purchaseStatus === filter;
}

function matchesVoidedStatus(
  isVoided: boolean,
  status: TransactionFilters["voidedStatus"],
) {
  if (status === "active") {
    return !isVoided;
  }

  if (status === "voided") {
    return isVoided;
  }

  return true;
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
