import type { TransactionFilters } from "@/components/transactions/transaction-log-types";
import type { TransactionLogItem } from "@/services/transaction-service";

export function matchesTransactionFilters(
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
