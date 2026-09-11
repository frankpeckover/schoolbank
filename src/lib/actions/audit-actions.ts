"use server";

import { requireAuditViewer } from "@/lib/actions/action-auth";
import { AdminDashboardService } from "@/domains/analytics/admin-dashboard-service";
import { AuditService } from "@/domains/audit/audit-service";

const adminDashboardService = new AdminDashboardService();
const auditService = new AuditService();

export async function getAdminDashboardSummary() {
  await requireAuditViewer();
  return adminDashboardService.getSummary();
}

export async function listAuditLog() {
  const currentUser = await requireAuditViewer();
  return auditService.listRecent(currentUser);
}
