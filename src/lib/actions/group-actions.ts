"use server";

import {
  canCreateLedgerAdjustments,
  canManageGroups,
} from "@/lib/auth/permissions";
import {
  requireGroupManager,
  requireUser,
} from "@/lib/actions/action-auth";
import type {
  BulkGroupMembershipInput,
  CreateGroupInput,
  UpdateGroupInput,
} from "@/services/group-service";
import { GroupImportService } from "@/services/group-import-service";
import type { ImportGroupsInput } from "@/services/group-import-service";
import { GroupService } from "@/services/group-service";

const groupImportService = new GroupImportService();
const groupService = new GroupService();

export async function listGroups(includeInactive = false) {
  const currentUser = await requireUser();

  if (!canManageGroups(currentUser) && !canCreateLedgerAdjustments(currentUser)) {
    return [];
  }

  return groupService.listGroups(includeInactive);
}

export async function listGroupMembers(groupId: string) {
  await requireGroupManager();
  return groupService.listGroupMembers(groupId);
}

export async function listUserGroups(userId: string) {
  await requireGroupManager();
  return groupService.listUserGroups(userId);
}

export async function createGroup(input: CreateGroupInput) {
  await requireGroupManager();
  return groupService.createGroup(input);
}

export async function updateGroup(input: UpdateGroupInput) {
  await requireGroupManager();
  return groupService.updateGroup(input);
}

export async function importGroups(input: ImportGroupsInput) {
  await requireGroupManager();
  return groupImportService.importGroups(input);
}

export async function addStudentToGroup(groupId: string, userId: string) {
  await requireGroupManager();
  return groupService.addStudentToGroup(groupId, userId);
}

export async function addStudentsToGroup(input: BulkGroupMembershipInput) {
  await requireGroupManager();
  return groupService.addStudentsToGroup(input);
}

export async function removeStudentFromGroup(groupId: string, userId: string) {
  await requireGroupManager();
  return groupService.removeStudentFromGroup(groupId, userId);
}

export async function removeStudentsFromGroup(input: BulkGroupMembershipInput) {
  await requireGroupManager();
  return groupService.removeStudentsFromGroup(input);
}

export async function setGroupActive(groupId: string, isActive: boolean) {
  await requireGroupManager();
  return groupService.setGroupActive(groupId, isActive);
}
