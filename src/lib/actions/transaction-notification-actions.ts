"use server";

import { TransactionNotificationService } from "@/domains/ledger/transaction-notification-service";
import { requireUser } from "@/lib/actions/action-auth";

const transactionNotificationService = new TransactionNotificationService();

export async function listUnseenTransactions() {
  const currentUser = await requireUser();

  return transactionNotificationService.listUnseen(currentUser);
}

export async function markTransactionsSeen(ledgerEntryIds: string[]) {
  const currentUser = await requireUser();

  return transactionNotificationService.markSeen(currentUser, ledgerEntryIds);
}
