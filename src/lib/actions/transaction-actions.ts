"use server";

import {
  requireBalanceViewer,
  requireLedgerAdjuster,
  requireUser,
} from "@/lib/actions/action-auth";
import type {
  CreateGroupLedgerAdjustmentInput,
  CreateLedgerAdjustmentInput,
  CreateLedgerAdjustmentsInput,
} from "@/services/transaction-service";
import { TransactionService } from "@/services/transaction-service";

const transactionService = new TransactionService();

export async function listTransactionLog() {
  const currentUser = await requireUser();
  return transactionService.listTransactions(currentUser.id, currentUser.role);
}

export async function getStudentBalance() {
  const currentUser = await requireUser();
  return transactionService.getStudentBalance(currentUser.id);
}

export async function listStudentBalances() {
  const currentUser = await requireBalanceViewer();
  return transactionService.listStudentBalances(currentUser.role);
}

export async function createLedgerAdjustment(
  input: CreateLedgerAdjustmentInput,
) {
  const currentUser = await requireLedgerAdjuster();
  return transactionService.createLedgerAdjustment(currentUser, input);
}

export async function createLedgerAdjustments(
  input: CreateLedgerAdjustmentsInput,
) {
  const currentUser = await requireLedgerAdjuster();
  return transactionService.createLedgerAdjustments(currentUser, input);
}

export async function createGroupLedgerAdjustment(
  input: CreateGroupLedgerAdjustmentInput,
) {
  const currentUser = await requireLedgerAdjuster();
  return transactionService.createGroupLedgerAdjustment(currentUser, input);
}

export async function voidTransaction(
  transactionId: string,
  voidReason: string,
) {
  const currentUser = await requireUser();
  return transactionService.voidTransaction(
    currentUser,
    transactionId,
    voidReason,
  );
}
