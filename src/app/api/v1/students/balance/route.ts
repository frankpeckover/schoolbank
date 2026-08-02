import {
  apiSuccessResult,
  handleApiRead,
} from "@/lib/api/api-route-helpers";
import { ApiFinanceService } from "@/services/api-finance-service";

const apiFinanceService = new ApiFinanceService();

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const email = requestUrl.searchParams.get("email") ?? "";

  return handleApiRead(request, "balances:read", async () =>
    apiSuccessResult(await apiFinanceService.getStudentBalanceByEmail(email)),
  );
}
