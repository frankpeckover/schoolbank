"use server";

import { AuthService } from "@/services/auth-service";
import { AdminDashboardService } from "@/services/admin-dashboard-service";
import { SchoolService } from "@/services/school-service";
import { ShopService } from "@/services/shop-service";
import { TransactionService } from "@/services/transaction-service";
import { UserService } from "@/services/user-service";
import type {
  CreateUserInput,
  ImportUsersInput,
  ResetUserPasswordInput,
  UpdateUserInput,
} from "@/services/user-service";
import type { UpdateSchoolInfoInput } from "@/services/school-service";
import type { SaveShopItemInput } from "@/services/shop-service";
import type { SessionUser } from "@/lib/session";
import type { CreateLedgerAdjustmentInput } from "@/services/transaction-service";

const authService = new AuthService();
const adminDashboardService = new AdminDashboardService();
const schoolService = new SchoolService();
const userService = new UserService();
const shopService = new ShopService();
const transactionService = new TransactionService();

export async function loginUser(username: string, password: string) {
  return authService.login(username, password);
}

export async function getAdminDashboardSummary() {
  return adminDashboardService.getSummary();
}

export async function listUsers() {
  return userService.listUsers();
}

export async function listStudents() {
  return userService.listStudents();
}

export async function createUser(input: CreateUserInput) {
  return userService.createUser(input);
}

export async function importUsers(input: ImportUsersInput) {
  return userService.importUsers(input);
}

export async function updateUser(input: UpdateUserInput) {
  return userService.updateUser(input);
}

export async function resetUserPassword(input: ResetUserPasswordInput) {
  return userService.resetPassword(input);
}

export async function setUserActive(userId: string, isActive: boolean) {
  return userService.setUserActive(userId, isActive);
}

export async function getSchoolInfo() {
  return schoolService.getSchoolInfo();
}

export async function updateSchoolInfo(input: UpdateSchoolInfoInput) {
  return schoolService.updateSchoolInfo(input);
}

export async function uploadSchoolLogo(formData: FormData) {
  const file = formData.get("logo");

  if (!(file instanceof File)) {
    return {
      ok: false as const,
      message: "Choose a logo file.",
    };
  }

  return schoolService.uploadLogo(file);
}

export async function listShopItems(includeInactive = false) {
  return shopService.listItems(includeInactive);
}

export async function saveShopItem(input: SaveShopItemInput) {
  return shopService.saveItem(input);
}

export async function removeShopItem(itemId: string) {
  return shopService.removeItem(itemId);
}

export async function requestShopItem(currentUser: SessionUser, itemId: string) {
  return shopService.requestPurchase(currentUser, itemId);
}

export async function listPendingShopRequests(currentUser: SessionUser) {
  return shopService.listPendingPurchaseRequests(currentUser);
}

export async function listStaffShopRequests(currentUser: SessionUser) {
  return shopService.listStaffShopRequests(currentUser);
}

export async function listStudentShopRequests(currentUser: SessionUser) {
  return shopService.listStudentShopRequests(currentUser);
}

export async function approveShopRequest(
  currentUser: SessionUser,
  purchaseId: string,
) {
  return shopService.approvePurchaseRequest(currentUser, purchaseId);
}

export async function denyShopRequest(
  currentUser: SessionUser,
  purchaseId: string,
  decisionNote: string,
) {
  return shopService.denyPurchaseRequest(currentUser, purchaseId, decisionNote);
}

export async function listTransactionLog(currentUser: SessionUser) {
  return transactionService.listTransactions(currentUser.id, currentUser.role);
}

export async function getStudentBalance(currentUser: SessionUser) {
  return transactionService.getStudentBalance(currentUser.id);
}

export async function createLedgerAdjustment(
  currentUser: SessionUser,
  input: CreateLedgerAdjustmentInput,
) {
  return transactionService.createLedgerAdjustment(currentUser, input);
}

export async function voidTransaction(
  currentUser: SessionUser,
  transactionId: string,
  voidReason: string,
) {
  return transactionService.voidTransaction(
    currentUser,
    transactionId,
    voidReason,
  );
}
