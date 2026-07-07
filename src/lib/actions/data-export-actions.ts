"use server";

import { requireAdmin } from "@/lib/actions/action-auth";
import { DataExportService } from "@/services/data-export-service";

const dataExportService = new DataExportService();

export async function exportSchoolData() {
  const currentUser = await requireAdmin();
  return dataExportService.exportSchoolData(currentUser);
}
