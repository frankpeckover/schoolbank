import type { TransactionLogItem } from "@/services/transaction-service";

export type TransactionFilters = {
  amountDirection: "" | "positive" | "negative";
  amountMax: string;
  amountMin: string;
  purchaseStatus: "" | "pending" | "approved" | "denied";
  reason: string;
  student: string;
  type: "" | TransactionLogItem["type"];
  voidedStatus: "" | "active" | "voided";
};

export const emptyTransactionFilters: TransactionFilters = {
  amountDirection: "",
  amountMax: "",
  amountMin: "",
  purchaseStatus: "",
  reason: "",
  student: "",
  type: "",
  voidedStatus: "active",
};
