import {
  apiSuccessResult,
  handleApiWrite,
} from "@/lib/api/api-route-helpers";
import { ApiFinanceService } from "@/services/api-finance-service";

const apiFinanceService = new ApiFinanceService();

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleApiWrite(request, "ledger:hold", async (apiClient, body) =>
    apiSuccessResult(
      await apiFinanceService.createHold(apiClient, {
        amount: body.amount,
        description: body.description,
        studentUserId: body.studentUserId,
      }),
      201,
    ),
  );
}

