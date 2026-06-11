"use server";

import { AuthService } from "@/services/auth-service";
import { SchoolService } from "@/services/school-service";
import { ShopService } from "@/services/shop-service";
import { TransactionService } from "@/services/transaction-service";
import { UserService } from "@/services/user-service";
import type { CreateUserInput } from "@/services/user-service";
import type { UpdateSchoolInfoInput } from "@/services/school-service";
import type { SaveShopItemInput } from "@/services/shop-service";
import type { SessionUser } from "@/lib/session";
import type { CreatePointTransactionInput } from "@/services/transaction-service";

const authService = new AuthService();
const schoolService = new SchoolService();
const userService = new UserService();
const shopService = new ShopService();
const transactionService = new TransactionService();

export async function loginUser(username: string, password: string) {
  return authService.login(username, password);
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

export async function setUserActive(userId: string, isActive: boolean) {
  return userService.setUserActive(userId, isActive);
}

export async function getSchoolInfo() {
  return schoolService.getSchoolInfo();
}

export async function updateSchoolInfo(input: UpdateSchoolInfoInput) {
  return schoolService.updateSchoolInfo(input);
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

export async function purchaseShopItem(userId: string, itemId: string) {
  return shopService.purchaseItem(userId, itemId);
}

export async function listTransactionLog(currentUser: SessionUser) {
  return transactionService.listTransactions(currentUser.id, currentUser.role);
}

export async function getStudentBalance(currentUser: SessionUser) {
  return transactionService.getStudentBalance(currentUser.id);
}

export async function createPointTransaction(
  currentUser: SessionUser,
  input: CreatePointTransactionInput,
) {
  return transactionService.createPointTransaction(currentUser, input);
}
