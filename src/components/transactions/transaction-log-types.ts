import type { TransactionLogItem } from "@/services/transaction-service";

export type TransactionFilters = {
  amountDirection: "" | "positive" | "negative";
  purchaseStatus: "" | "pending" | "approved" | "denied";
  reason: string;
  student: string;
  type: "" | TransactionLogItem["type"];
  voidedStatus: "" | "active" | "voided";
};

export const emptyTransactionFilters: TransactionFilters = {
  amountDirection: "",
  purchaseStatus: "",
  reason: "",
  student: "",
  type: "",
  voidedStatus: "active",
};
