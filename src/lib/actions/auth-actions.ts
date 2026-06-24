"use server";

import { AuthService } from "@/services/auth-service";
import { PasswordResetService } from "@/services/password-reset-service";
import type { CompletePasswordResetInput } from "@/services/password-reset-service";
import { sessionService } from "@/lib/actions/action-auth";

const authService = new AuthService();
const passwordResetService = new PasswordResetService();

export async function loginUser(username: string, password: string) {
  const result = await authService.login(username, password);

  if (result.ok) {
    await sessionService.createSession(result.user.id);
  }

  return result;
}

export async function logoutUser() {
  await sessionService.clearSession();
}

export async function getCurrentSessionUser() {
  return sessionService.getCurrentUser();
}

export async function requestPasswordReset(identifier: string) {
  return passwordResetService.requestPasswordReset(identifier);
}

export async function completePasswordReset(input: CompletePasswordResetInput) {
  return passwordResetService.completePasswordReset(input);
}
