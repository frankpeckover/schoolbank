"use server";

import {
  requireSchoolSettingsManager,
  requireStaff,
  requireUser,
} from "@/lib/actions/action-auth";
import {
  TransactionPresetService,
  type UpdateTransactionPresetsInput,
  type UpdatePersonalTransactionPresetsInput,
} from "@/domains/ledger/transaction-preset-service";

const transactionPresetService = new TransactionPresetService();

export async function getTransactionPresets() {
  await requireUser();
  return transactionPresetService.getPresets();
}

export async function getMyTransactionPresets() {
  const currentUser = await requireStaff();
  return transactionPresetService.getPersonalPresets(currentUser);
}

export async function updateTransactionPresets(
  input: UpdateTransactionPresetsInput,
) {
  const currentUser = await requireSchoolSettingsManager();
  return transactionPresetService.updatePresets(currentUser, input);
}

export async function updateMyTransactionPresets(
  input: UpdatePersonalTransactionPresetsInput,
) {
  const currentUser = await requireStaff();
  return transactionPresetService.updatePersonalPresets(currentUser, input);
}
