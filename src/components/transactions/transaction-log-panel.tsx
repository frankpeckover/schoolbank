"use client";

import { useEffect, useState } from "react";
import { listTransactionLog, voidTransaction } from "@/lib/actions";
import { downloadCsv } from "@/lib/client-csv";
import {
  canViewAllTransactions,
  canVoidTransactions,
} from "@/lib/permissions";
import type { SessionUser } from "@/lib/session";
import type { TransactionLogItem } from "@/services/transaction-service";
import { getSignedAmountTextClassName } from "@/lib/amount-style";
import {
  formatDateTime,
  formatSignedCurrencyAmount,
} from "@/lib/formatters";
import { matchesTransactionFilters } from "@/components/transactions/transaction-filter-utils";
import { TransactionDetailsModal } from "@/components/transactions/transaction-details-modal";
import {
  emptyTransactionFilters,
  type TransactionFilters,
} from "@/components/transactions/transaction-log-types";
import { TransactionStatusBadge } from "@/components/transactions/transaction-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import {
  EyeIcon,
  FileDownIcon,
  FilterIcon,
  ListIcon,
  XIcon,
} from "@/components/ui/icons";
import { PanelToolbar } from "@/components/ui/panel-toolbar";
import { TextReasonModal } from "@/components/ui/text-reason-modal";

type TransactionLogPanelProps = {
  currencyName: string;
  currentUser: SessionUser;
  title?: string;
};

export function TransactionLogPanel({
  currencyName,
  currentUser,
}: TransactionLogPanelProps) {
  const canViewAllTransactionsForUser = canViewAllTransactions(currentUser);
  const canVoidTransactionsForUser = canVoidTransactions(currentUser);
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
      const loadedTransactions = await listTransactionLog();
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
        const loadedTransactions = await listTransactionLog();

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
  }, []);

  async function handleVoidTransaction(reason: string) {
    if (!voidingTransaction) {
      return;
    }
    setError(null);
    setMessage(null);

    const result = await voidTransaction(voidingTransaction.id, reason);

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
    <section className="theme-panel motion-panel mt-5 min-w-0 p-4">
      <PanelToolbar
        actions={
          <>
            <IconButton
              ariaExpanded={areFiltersOpen}
              label={areFiltersOpen ? "Hide filters" : "Show filters"}
              onClick={() => setAreFiltersOpen((isOpen) => !isOpen)}
              text="Filters"
            >
              <FilterIcon />
            </IconButton>
            <IconButton
              label="Export transactions"
              onClick={() => {
                if (isLoading || filteredTransactions.length === 0) {
                  return;
                }

                downloadTransactions(filteredTransactions, currencyName);
              }}
              text="Export"
            >
              <FileDownIcon />
            </IconButton>
          </>
        }
      >
        {!isLoading && !error && filteredTransactions.length > 0 && (
          <p className="text-sm font-semibold text-text-muted">
            Showing {filteredTransactions.length} of {transactions.length} transactions.
          </p>
        )}
      </PanelToolbar>

      <div>
        {areFiltersOpen && (
          <TransactionFilters
            canViewAllTransactions={canViewAllTransactionsForUser}
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
          <EmptyState
            description="Transactions will appear here after credits are issued, removed, held, spent, or voided."
            icon={<ListIcon />}
            title="No transactions yet"
          />
        )}
        {!isLoading && !error && transactions.length > 0 && filteredTransactions.length === 0 && (
          <EmptyState
            description="Try changing or clearing the filters to see more ledger activity."
            icon={<FilterIcon />}
            title="No matching transactions"
          />
        )}
        {!isLoading && !error && filteredTransactions.length > 0 && (
          <TransactionList
            canViewAllTransactions={canViewAllTransactionsForUser}
            canVoidTransactions={canVoidTransactionsForUser}
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
      <div className="grid w-full min-w-0 gap-2 md:hidden">
        {transactions.map((transaction) => (
          <TransactionMobileRow
            currencyName={currencyName}
            key={transaction.id}
            onDetailsClick={onDetailsClick}
            transaction={transaction}
          />
        ))}
      </div>

      <div className="hidden w-full min-w-0 max-w-full overflow-x-auto md:block">
        <table className="w-full min-w-full table-fixed border-collapse text-left text-sm">
          <TransactionTableColumnGroup
            canViewAllTransactions={canViewAllTransactions}
          />
          <thead>
            <tr className="border-b border-border-subtle text-text-muted">
              <th className="py-2 pr-4 font-semibold">Description</th>
              {canViewAllTransactions && (
                <th className="py-2 pr-4 font-semibold">Account</th>
              )}
              <th className="py-2 pr-4 font-semibold">Status</th>
              <th className="py-2 pr-4 text-right font-semibold">Amount</th>
              <th className="py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr className="border-b border-border-subtle" key={transaction.id}>
                <td className="break-words py-2 pr-4">
                  <span className="font-semibold">{transaction.reason}</span>
                  <span className="mt-1 block text-xs text-text-muted">
                    {formatDateTime(transaction.createdAt)}
                  </span>
                  <span className="mt-1 block text-xs text-text-subtle">
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
                <td
                  className={`py-2 pr-4 text-right font-semibold ${getSignedAmountTextClassName(transaction.amount)}`}
                >
                  {formatSignedCurrencyAmount(transaction.amount, currencyName)}
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
      </div>
    </>
  );
}

function TransactionTableColumnGroup({
  canViewAllTransactions,
}: {
  canViewAllTransactions: boolean;
}) {
  if (canViewAllTransactions) {
    return (
      <colgroup>
        <col className="w-[42%]" />
        <col className="w-[20%]" />
        <col className="w-[14%]" />
        <col className="w-[14%]" />
        <col className="w-[10%]" />
      </colgroup>
    );
  }

  return (
    <colgroup>
      <col className="w-[52%]" />
      <col className="w-[18%]" />
      <col className="w-[20%]" />
      <col className="w-[10%]" />
    </colgroup>
  );
}

function TransactionMobileRow({
  currencyName,
  onDetailsClick,
  transaction,
}: {
  currencyName: string;
  onDetailsClick: (transaction: TransactionLogItem) => void;
  transaction: TransactionLogItem;
}) {
  const amountLabel = formatSignedCurrencyAmount(
    transaction.amount,
    currencyName,
  );

  return (
    <article className="theme-card flex w-full min-w-0 items-center justify-between gap-3 overflow-hidden p-3">
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="break-words text-sm font-semibold">
          {transaction.reason}
        </p>
        <p className="mt-1 truncate text-xs text-text-muted">
          {formatDateTime(transaction.createdAt)}
        </p>
        <p
          className={`mt-1 text-sm font-semibold ${getSignedAmountTextClassName(transaction.amount)}`}
        >
          {amountLabel}
        </p>
      </div>
      <div className="shrink-0">
        <IconButton
          label="Transaction details"
          onClick={() => onDetailsClick(transaction)}
        >
          <EyeIcon />
        </IconButton>
      </div>
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
    <div className="theme-subpanel mt-4 p-3">
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

function downloadTransactions(
  transactions: TransactionLogItem[],
  currencyName: string,
) {
  downloadCsv(
    "transaction-log.csv",
    [
      "date",
      "description",
      "account",
      "username",
      "status",
      "amount",
      "currency",
      "source",
      "reference",
    ],
    transactions.map((transaction) => [
      formatDateTime(transaction.createdAt),
      transaction.reason,
      transaction.studentName,
      transaction.studentUsername,
      transaction.isVoided ? "Voided" : transaction.entryStatus,
      transaction.amount,
      currencyName,
      transaction.source,
      transaction.reference,
    ]),
  );
}
