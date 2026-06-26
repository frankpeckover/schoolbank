"use server";

import { requireLedgerAdjuster } from "@/lib/actions/action-auth";
import { TeacherDashboardService } from "@/services/teacher-dashboard-service";

const teacherDashboardService = new TeacherDashboardService();

export async function getTeacherDashboardSummary() {
  const currentUser = await requireLedgerAdjuster();
  return teacherDashboardService.getSummary(currentUser);
}
