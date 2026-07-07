"use server";

import {
  requireSchoolSettingsManager,
  requireUser,
} from "@/lib/actions/action-auth";
import {
  TransactionPresetService,
  type UpdateTransactionPresetsInput,
} from "@/services/transaction-preset-service";

const transactionPresetService = new TransactionPresetService();

export async function getTransactionPresets() {
  await requireUser();
  return transactionPresetService.getPresets();
}

export async function updateTransactionPresets(
  input: UpdateTransactionPresetsInput,
) {
  const currentUser = await requireSchoolSettingsManager();
  return transactionPresetService.updatePresets(currentUser, input);
}
