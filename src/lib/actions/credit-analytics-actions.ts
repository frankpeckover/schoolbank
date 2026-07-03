"use server";

import { requireBalanceViewer } from "@/lib/actions/action-auth";
import { CreditAnalyticsService } from "@/services/credit-analytics-service";

const creditAnalyticsService = new CreditAnalyticsService();

export async function getCreditAnalyticsSummary(filter = "", windowDays = 30) {
  await requireBalanceViewer();
  return creditAnalyticsService.getSummary(filter, windowDays);
}

export async function searchCreditAnalyticsScopes(searchTerm: string) {
  await requireBalanceViewer();
  return creditAnalyticsService.searchScopes(searchTerm);
}
