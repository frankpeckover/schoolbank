"use server";

import { requireAuditViewer } from "@/lib/actions/action-auth";
import { ErrorLogService } from "@/domains/audit/error-log-service";

const errorLogService = new ErrorLogService();

export async function listErrorLog() {
  const currentUser = await requireAuditViewer();
  return errorLogService.listRecent(currentUser);
}
