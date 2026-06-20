"use client";

import { useEffect, useState } from "react";
import { listTransactionLog, voidTransaction } from "@/lib/actions";
import type { SessionUser } from "@/lib/session";
import type { TransactionLogItem } from "@/services/transaction-service";
import { formatCurrencyAmount, formatDateTime } from "@/lib/formatters";
import { matchesTransactionFilters } from "@/components/transactions/transaction-filter-utils";
import { TransactionDetailsModal } from "@/components/transactions/transaction-details-modal";
import {
  emptyTransactionFilters,
  type TransactionFilters,
} from "@/components/transactions/transaction-log-types";
import { TransactionStatusBadge } from "@/components/transactions/transaction-status-badge";
import { IconButton } from "@/components/ui/icon-button";
import { EyeIcon, FilterIcon, XIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { TextReasonModal } from "@/components/ui/text-reason-modal";

type TransactionLogPanelProps = {
  currencyName: string;
  currentUser: SessionUser;
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
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
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
    <section className="motion-panel mt-5 rounded-md border border-border bg-surface p-4 shadow-sm">
      <PageHeader
        actions={
          <IconButton
            ariaExpanded={areFiltersOpen}
            label={areFiltersOpen ? "Hide filters" : "Show filters"}
            onClick={() => setAreFiltersOpen((isOpen) => !isOpen)}
          >
            <FilterIcon />
          </IconButton>
        }
        description={
          canViewAllTransactions
            ? "Showing all recorded transactions."
            : "Showing your recorded transactions."
        }
        title="Transaction Log"
        titleSize="base"
      />

      <div>
        {areFiltersOpen && (
          <TransactionFilters
            canViewAllTransactions={canViewAllTransactions}
            filters={filters}
            onFiltersChange={setFilters}
          />
        )}
      </div>

      <div className="mt-5">
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
          <TransactionList
            canViewAllTransactions={canViewAllTransactions}
            canVoidTransactions={canVoidTransactions}
            currencyName={currencyName}
            onDetailsClick={setViewingTransaction}
            onVoidClick={setVoidingTransaction}
            transactions={filteredTransactions}
          />
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

function TransactionList({
  canViewAllTransactions,
  canVoidTransactions,
  currencyName,
  onDetailsClick,
  onVoidClick,
  transactions,
}: {
  canViewAllTransactions: boolean;
  canVoidTransactions: boolean;
  currencyName: string;
  onDetailsClick: (transaction: TransactionLogItem) => void;
  onVoidClick: (transaction: TransactionLogItem) => void;
  transactions: TransactionLogItem[];
}) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {transactions.map((transaction) => (
          <TransactionCard
            canViewAllTransactions={canViewAllTransactions}
            canVoidTransactions={canVoidTransactions}
            currencyName={currencyName}
            key={transaction.id}
            onDetailsClick={onDetailsClick}
            onVoidClick={onVoidClick}
            transaction={transaction}
          />
        ))}
      </div>

      <table className="hidden w-full border-collapse text-left text-sm md:table">
        <thead>
          <tr className="border-b border-border-subtle text-text-muted">
            <th className="py-2 pr-4 font-semibold">Date</th>
            <th className="py-2 pr-4 font-semibold">Description</th>
            {canViewAllTransactions && (
              <th className="py-2 pr-4 font-semibold">Account</th>
            )}
            <th className="py-2 pr-4 font-semibold">Status</th>
            <th className="py-2 pr-4 text-right font-semibold">In</th>
            <th className="py-2 pr-4 text-right font-semibold">Out</th>
            <th className="py-2 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr className="border-b border-border-subtle" key={transaction.id}>
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
                <TransactionActions
                  canVoidTransactions={canVoidTransactions}
                  onDetailsClick={onDetailsClick}
                  onVoidClick={onVoidClick}
                  transaction={transaction}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function TransactionCard({
  canViewAllTransactions,
  canVoidTransactions,
  currencyName,
  onDetailsClick,
  onVoidClick,
  transaction,
}: {
  canViewAllTransactions: boolean;
  canVoidTransactions: boolean;
  currencyName: string;
  onDetailsClick: (transaction: TransactionLogItem) => void;
  onVoidClick: (transaction: TransactionLogItem) => void;
  transaction: TransactionLogItem;
}) {
  const amountClassName =
    transaction.amount >= 0 ? "text-success" : "text-danger-strong";

  return (
    <article className="rounded-md border border-border-subtle bg-panel-soft p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{transaction.reason}</h3>
          <p className="text-xs text-text-muted">
            {formatDateTime(transaction.createdAt)}
          </p>
        </div>
        <TransactionActions
          canVoidTransactions={canVoidTransactions}
          onDetailsClick={onDetailsClick}
          onVoidClick={onVoidClick}
          transaction={transaction}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TransactionStatusBadge transaction={transaction} />
        <span className={`text-sm font-semibold ${amountClassName}`}>
          {transaction.amount >= 0 ? "" : "-"}
          {formatCurrencyAmount(transaction.amount, currencyName)}
        </span>
      </div>
      <p className="mt-2 text-sm text-text-muted">{transaction.description}</p>
      {canViewAllTransactions && (
        <p className="mt-2 truncate text-sm text-text-muted">
          {transaction.studentName} ({transaction.studentUsername})
        </p>
      )}
    </article>
  );
}

function TransactionActions({
  canVoidTransactions,
  onDetailsClick,
  onVoidClick,
  transaction,
}: {
  canVoidTransactions: boolean;
  onDetailsClick: (transaction: TransactionLogItem) => void;
  onVoidClick: (transaction: TransactionLogItem) => void;
  transaction: TransactionLogItem;
}) {
  return (
    <div className="flex gap-2">
      <IconButton label="Transaction details" onClick={() => onDetailsClick(transaction)}>
        <EyeIcon />
      </IconButton>
      {canVoidTransactions && (
        <IconButton
          disabled={transaction.isVoided || transaction.type === "void_reversal"}
          label="Void transaction"
          onClick={() => onVoidClick(transaction)}
        >
          <XIcon />
        </IconButton>
      )}
    </div>
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
