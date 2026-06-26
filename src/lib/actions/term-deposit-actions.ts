"use server";

import {
  requireSchoolSettingsManager,
  requireUser,
} from "@/lib/actions/action-auth";
import type {
  CreateTermDepositInput,
  UpdateTermDepositSettingsInput,
} from "@/services/term-deposit-service";
import { TermDepositService } from "@/services/term-deposit-service";

const termDepositService = new TermDepositService();

export async function getTermDepositSettings() {
  await requireUser();
  return termDepositService.getSettings();
}

export async function updateTermDepositSettings(
  input: UpdateTermDepositSettingsInput,
) {
  const currentUser = await requireSchoolSettingsManager();
  return termDepositService.updateSettings(currentUser, input);
}

export async function listStudentTermDeposits() {
  const currentUser = await requireUser();
  return termDepositService.listStudentDeposits(currentUser);
}

export async function createTermDeposit(input: CreateTermDepositInput) {
  const currentUser = await requireUser();
  return termDepositService.createDeposit(currentUser, input);
}
