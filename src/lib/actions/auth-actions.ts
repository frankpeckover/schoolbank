"use server";

import { AuthService } from "@/services/auth-service";
import { PasswordResetService } from "@/services/password-reset-service";
import type { CompletePasswordResetInput } from "@/services/password-reset-service";
import { sessionService } from "@/lib/actions/action-auth";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { AuditService } from "@/services/audit-service";

const authService = new AuthService();
const auditService = new AuditService();
const passwordResetService = new PasswordResetService();
const loginRateLimitWindowMilliseconds = 5 * 60 * 1000;
const passwordResetRateLimitWindowMilliseconds = 15 * 60 * 1000;
const maxLoginAttemptsPerWindow = 8;
const maxPasswordResetAttemptsPerWindow = 5;

export async function loginUser(username: string, password: string) {
  await assertSameOriginRequest();

  const rateLimit = await consumeRateLimit({
    key: `login:${username}`,
    maxAttempts: maxLoginAttemptsPerWindow,
    windowMilliseconds: loginRateLimitWindowMilliseconds,
  });

  if (!rateLimit.ok) {
    return {
      ok: false as const,
      message: `Too many login attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
    };
  }

  const result = await authService.login(username, password);

  if (result.ok) {
    await sessionService.createSession(result.user.id);
  }

  return result;
}

export async function logoutUser() {
  await assertSameOriginRequest();
  const currentUser = await sessionService.getCurrentUser();

  if (currentUser) {
    try {
      await auditService.log({
        action: "auth.logout",
        actorUserId: currentUser.id,
        details: { username: currentUser.username },
        entityId: currentUser.id,
        entityType: "auth",
      });
    } catch (error) {
      console.error("Logout audit log failed", error);
    }
  }

  await sessionService.clearSession();
}

export async function getCurrentSessionUser() {
  await assertSameOriginRequest();
  return sessionService.getCurrentUser();
}

export async function requestPasswordReset(identifier: string) {
  await assertSameOriginRequest();

  const rateLimit = await consumeRateLimit({
    key: `password-reset:${identifier}`,
    maxAttempts: maxPasswordResetAttemptsPerWindow,
    windowMilliseconds: passwordResetRateLimitWindowMilliseconds,
  });

  if (!rateLimit.ok) {
    return {
      ok: false as const,
      message: `Too many reset requests. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
    };
  }

  return passwordResetService.requestPasswordReset(identifier);
}

export async function completePasswordReset(input: CompletePasswordResetInput) {
  await assertSameOriginRequest();
  return passwordResetService.completePasswordReset(input);
}
