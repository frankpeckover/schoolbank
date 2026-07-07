import {
  apiSuccessResult,
  handleApiWrite,
} from "@/lib/api/api-route-helpers";
import { ApiFinanceService } from "@/services/api-finance-service";

type HoldRouteContext = {
  params: Promise<{
    holdId: string;
  }>;
};

const apiFinanceService = new ApiFinanceService();

export const runtime = "nodejs";

export async function POST(request: Request, context: HoldRouteContext) {
  const { holdId } = await context.params;

  return handleApiWrite(request, "ledger:hold", async (apiClient, body) =>
    apiSuccessResult(
      await apiFinanceService.releaseHold(apiClient, holdId, {
        description: body.description,
      }),
    ),
  );
}

