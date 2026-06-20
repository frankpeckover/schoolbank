import { TransactionStatusBadge } from "@/components/transactions/transaction-status-badge";
import { formatCurrencyAmount, formatDateTime } from "@/lib/formatters";
import type { TransactionLogItem } from "@/services/transaction-service";

type TransactionDetailsModalProps = {
  currencyName: string;
  onClose: () => void;
  transaction: TransactionLogItem;
};

export function TransactionDetailsModal({
  currencyName,
  onClose,
  transaction,
}: TransactionDetailsModalProps) {
  const amountLabel =
    transaction.amount >= 0
      ? formatCurrencyAmount(transaction.amount, currencyName)
      : `-${formatCurrencyAmount(transaction.amount, currencyName)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6">
      <div className="motion-pop max-h-full w-full max-w-2xl overflow-y-auto rounded-md border border-border bg-surface p-5 shadow-lg">
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
          <TransactionDetail label="Status" value={getStatusLabel(transaction)} />
          <TransactionDetail label="Account" value={transaction.studentName} />
          <TransactionDetail label="Account name" value={transaction.accountName} />
          <TransactionDetail
            label="Username"
            value={transaction.studentUsername}
          />
          <TransactionDetail label="Source" value={transaction.source} />
          <TransactionDetail
            label="Created by"
            value={formatUserReference(
              transaction.createdByName,
              transaction.createdByUsername,
            )}
          />
          <TransactionDetail label="Reference" value={transaction.reference} />
          <TransactionDetail
            label="Purchase status"
            value={transaction.purchaseStatus ?? "-"}
          />
          <TransactionDetail
            label="Related record"
            value={formatRelatedRecord(transaction)}
          />
          <TransactionDetail
            label="Voided at"
            value={
              transaction.voidedAt ? formatDateTime(transaction.voidedAt) : "-"
            }
          />
          <TransactionDetail
            label="Voided by"
            value={transaction.voidedByName ?? "-"}
          />
          <TransactionDetail
            label="Void reason"
            value={transaction.voidReason || "-"}
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

function getStatusLabel(transaction: TransactionLogItem) {
  if (transaction.isVoided) {
    return "Voided";
  }

  if (transaction.entryStatus === "pending") {
    return "Pending";
  }

  return "Posted";
}

function formatRelatedRecord(transaction: TransactionLogItem) {
  if (!transaction.relatedEntityType || !transaction.relatedEntityId) {
    return "-";
  }

  return `${formatEntityType(transaction.relatedEntityType)} ${transaction.relatedEntityId}`;
}

function formatEntityType(entityType: string) {
  return entityType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatUserReference(name: string | null, username: string | null) {
  if (name && username) {
    return `${name} (${username})`;
  }

  return name ?? username ?? "-";
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
