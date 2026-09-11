"use server";

import { requireBalanceViewer } from "@/lib/actions/action-auth";
import {
  CreditAnalyticsService,
  type CreditAnalyticsWindowInput,
} from "@/domains/analytics/credit-analytics-service";

const creditAnalyticsService = new CreditAnalyticsService();

export async function getCreditAnalyticsSummary(
  filter = "",
  windowInput: CreditAnalyticsWindowInput = 30,
) {
  await requireBalanceViewer();
  return creditAnalyticsService.getSummary(filter, windowInput);
}

export async function searchCreditAnalyticsScopes(searchTerm: string) {
  await requireBalanceViewer();
  return creditAnalyticsService.searchScopes(searchTerm);
}
