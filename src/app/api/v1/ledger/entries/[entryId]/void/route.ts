import {
  apiSuccessResult,
  handleApiWrite,
} from "@/lib/api/api-route-helpers";
import { ApiFinanceService } from "@/services/api-finance-service";

type EntryRouteContext = {
  params: Promise<{
    entryId: string;
  }>;
};

const apiFinanceService = new ApiFinanceService();

export const runtime = "nodejs";

export async function POST(request: Request, context: EntryRouteContext) {
  const { entryId } = await context.params;

  return handleApiWrite(request, "ledger:void", async (apiClient, body) =>
    apiSuccessResult(
      await apiFinanceService.voidApiEntry(apiClient, entryId, {
        description: body.description,
      }),
    ),
  );
}

