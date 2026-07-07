export type TransactionPresets = {
  amounts: number[];
  reasons: string[];
};

export const maxQuickAmounts = 5;
export const maxQuickReasons = 6;
export const defaultTransactionPresets: TransactionPresets = {
  amounts: [1, 5, 10, 25, 50],
  reasons: [
    "Great effort",
    "Helping others",
    "Homework complete",
    "Positive participation",
    "Late work",
    "Class disruption",
  ],
};
