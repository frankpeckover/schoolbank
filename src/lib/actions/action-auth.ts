import {
  canCreateLedgerAdjustments,
  canManageGroups,
  canManageSchoolSettings,
  canManageShopItems,
  canManageUsers,
  canViewAuditLog,
  canViewStudentBalances,
  isStaff,
} from "@/lib/auth/permissions";
import { SessionService } from "@/services/session-service";

const sessionService = new SessionService();

export async function requireUser() {
  const currentUser = await sessionService.getCurrentUser();

  if (!currentUser) {
    throw new Error("Not authenticated.");
  }

  return currentUser;
}

export async function requireAdmin() {
  const currentUser = await requireUser();

  if (!canManageUsers(currentUser)) {
    throw new Error("Not authorised.");
  }

  return currentUser;
}

export async function requireStaff() {
  const currentUser = await requireUser();

  if (!isStaff(currentUser)) {
    throw new Error("Not authorised.");
  }

  return currentUser;
}

export async function requireGroupManager() {
  const currentUser = await requireUser();

  if (!canManageGroups(currentUser)) {
    throw new Error("Not authorised.");
  }

  return currentUser;
}

export async function requireLedgerAdjuster() {
  const currentUser = await requireUser();

  if (!canCreateLedgerAdjustments(currentUser)) {
    throw new Error("Not authorised.");
  }

  return currentUser;
}

export async function requireSchoolSettingsManager() {
  const currentUser = await requireUser();

  if (!canManageSchoolSettings(currentUser)) {
    throw new Error("Not authorised.");
  }

  return currentUser;
}

export async function requireShopManager() {
  const currentUser = await requireUser();

  if (!canManageShopItems(currentUser)) {
    throw new Error("Not authorised.");
  }

  return currentUser;
}

export async function requireAuditViewer() {
  const currentUser = await requireUser();

  if (!canViewAuditLog(currentUser)) {
    throw new Error("Not authorised.");
  }

  return currentUser;
}

export async function requireBalanceViewer() {
  const currentUser = await requireUser();

  if (!canViewStudentBalances(currentUser)) {
    throw new Error("Not authorised.");
  }

  return currentUser;
}

export { sessionService };
