"use server";

import { AuthService } from "@/services/auth-service";
import { AdminDashboardService } from "@/services/admin-dashboard-service";
import { AuditService } from "@/services/audit-service";
import { GroupImportService } from "@/services/group-import-service";
import { GroupService } from "@/services/group-service";
import { SchoolService } from "@/services/school-service";
import { ShopItemService } from "@/services/shop-item-service";
import { ShopPurchaseService } from "@/services/shop-purchase-service";
import { TransactionService } from "@/services/transaction-service";
import { UserService } from "@/services/user-service";
import type {
  ChangeOwnPasswordInput,
  CreateUserInput,
  ImportUsersInput,
  ResetUserPasswordInput,
  UpdateUserInput,
} from "@/services/user-service";
import type { UpdateSchoolInfoInput } from "@/services/school-service";
import type {
  BulkGroupMembershipInput,
  CreateGroupInput,
  UpdateGroupInput,
} from "@/services/group-service";
import type { ImportGroupsInput } from "@/services/group-import-service";
import type { SaveShopItemInput } from "@/services/shop-service";
import type { SessionUser } from "@/lib/session";
import type {
  CreateGroupLedgerAdjustmentInput,
  CreateLedgerAdjustmentInput,
} from "@/services/transaction-service";

const authService = new AuthService();
const adminDashboardService = new AdminDashboardService();
const auditService = new AuditService();
const groupImportService = new GroupImportService();
const groupService = new GroupService();
const schoolService = new SchoolService();
const userService = new UserService();
const shopItemService = new ShopItemService();
const shopPurchaseService = new ShopPurchaseService();
const transactionService = new TransactionService();

export async function loginUser(username: string, password: string) {
  return authService.login(username, password);
}

export async function getAdminDashboardSummary() {
  return adminDashboardService.getSummary();
}

export async function listAuditLog(currentUser: SessionUser) {
  return auditService.listRecent(currentUser);
}

export async function listUsers() {
  return userService.listUsers();
}

export async function listStudents() {
  return userService.listStudents();
}

export async function searchStudents(searchTerm: string) {
  return userService.searchStudents(searchTerm);
}

export async function createUser(currentUser: SessionUser, input: CreateUserInput) {
  return userService.createUser(input, currentUser);
}

export async function importUsers(currentUser: SessionUser, input: ImportUsersInput) {
  return userService.importUsers(input, currentUser);
}

export async function updateUser(currentUser: SessionUser, input: UpdateUserInput) {
  return userService.updateUser(input, currentUser);
}

export async function resetUserPassword(
  currentUser: SessionUser,
  input: ResetUserPasswordInput,
) {
  return userService.resetPassword(input, currentUser);
}

export async function changeOwnPassword(
  currentUser: SessionUser,
  input: ChangeOwnPasswordInput,
) {
  return userService.changeOwnPassword(currentUser, input);
}

export async function setUserActive(
  currentUser: SessionUser,
  userId: string,
  isActive: boolean,
) {
  return userService.setUserActive(userId, isActive, currentUser);
}

export async function listGroups(includeInactive = false) {
  return groupService.listGroups(includeInactive);
}

export async function listGroupMembers(groupId: string) {
  return groupService.listGroupMembers(groupId);
}

export async function listUserGroups(userId: string) {
  return groupService.listUserGroups(userId);
}

export async function createGroup(input: CreateGroupInput) {
  return groupService.createGroup(input);
}

export async function updateGroup(input: UpdateGroupInput) {
  return groupService.updateGroup(input);
}

export async function importGroups(input: ImportGroupsInput) {
  return groupImportService.importGroups(input);
}

export async function addStudentToGroup(groupId: string, userId: string) {
  return groupService.addStudentToGroup(groupId, userId);
}

export async function addStudentsToGroup(input: BulkGroupMembershipInput) {
  return groupService.addStudentsToGroup(input);
}

export async function removeStudentFromGroup(groupId: string, userId: string) {
  return groupService.removeStudentFromGroup(groupId, userId);
}

export async function removeStudentsFromGroup(input: BulkGroupMembershipInput) {
  return groupService.removeStudentsFromGroup(input);
}

export async function setGroupActive(groupId: string, isActive: boolean) {
  return groupService.setGroupActive(groupId, isActive);
}

export async function getSchoolInfo() {
  return schoolService.getSchoolInfo();
}

export async function updateSchoolInfo(
  currentUser: SessionUser,
  input: UpdateSchoolInfoInput,
) {
  return schoolService.updateSchoolInfo(currentUser, input);
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
  return shopItemService.listItems(includeInactive);
}

export async function saveShopItem(
  currentUser: SessionUser,
  input: SaveShopItemInput,
) {
  return shopItemService.saveItem(currentUser, input);
}

export async function uploadShopItemImage(formData: FormData) {
  const file = formData.get("image");

  if (!(file instanceof File)) {
    return {
      ok: false as const,
      message: "Choose an item image.",
    };
  }

  return shopItemService.uploadImage(file);
}

export async function removeShopItem(currentUser: SessionUser, itemId: string) {
  return shopItemService.removeItem(currentUser, itemId);
}

export async function requestShopItem(currentUser: SessionUser, itemId: string) {
  return shopPurchaseService.requestPurchase(currentUser, itemId);
}

export async function listPendingShopRequests(currentUser: SessionUser) {
  return shopPurchaseService.listPendingPurchaseRequests(currentUser);
}

export async function listStaffShopRequests(currentUser: SessionUser) {
  return shopPurchaseService.listStaffShopRequests(currentUser);
}

export async function listStudentShopRequests(currentUser: SessionUser) {
  return shopPurchaseService.listStudentShopRequests(currentUser);
}

export async function approveShopRequest(
  currentUser: SessionUser,
  purchaseId: string,
) {
  return shopPurchaseService.approvePurchaseRequest(currentUser, purchaseId);
}

export async function denyShopRequest(
  currentUser: SessionUser,
  purchaseId: string,
  decisionNote: string,
) {
  return shopPurchaseService.denyPurchaseRequest(
    currentUser,
    purchaseId,
    decisionNote,
  );
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

export async function createGroupLedgerAdjustment(
  currentUser: SessionUser,
  input: CreateGroupLedgerAdjustmentInput,
) {
  return transactionService.createGroupLedgerAdjustment(currentUser, input);
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
