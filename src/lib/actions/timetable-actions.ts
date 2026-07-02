"use server";

import { requireAdmin, requireLedgerAdjuster } from "@/lib/actions/action-auth";
import type { ImportTimetableEntriesInput } from "@/services/timetable-import-service";
import { TimetableImportService } from "@/services/timetable-import-service";
import type { CreateTimetableEntryInput } from "@/services/timetable-service";
import { TimetableService } from "@/services/timetable-service";

const timetableImportService = new TimetableImportService();
const timetableService = new TimetableService();

export async function listTimetableEntries(includeInactive = false) {
  await requireAdmin();
  return timetableService.listEntries(includeInactive);
}

export async function listTimetableTeachers() {
  await requireAdmin();
  return timetableService.listTeachers();
}

export async function createTimetableEntry(input: CreateTimetableEntryInput) {
  const currentUser = await requireAdmin();
  return timetableService.createEntry(input, currentUser);
}

export async function importTimetableEntries(
  input: ImportTimetableEntriesInput,
) {
  const currentUser = await requireAdmin();
  return timetableImportService.importEntries(input, currentUser);
}

export async function setTimetableEntryActive(
  entryId: string,
  isActive: boolean,
) {
  const currentUser = await requireAdmin();
  return timetableService.setEntryActive(entryId, isActive, currentUser);
}

export async function getCurrentTeacherClass() {
  const currentUser = await requireLedgerAdjuster();
  return timetableService.getCurrentClass(currentUser);
}
