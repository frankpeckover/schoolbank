import {
  apiSuccessResult,
  handleApiRead,
} from "@/lib/api/api-route-helpers";
import { ApiFinanceService } from "@/services/api-finance-service";

type BalanceRouteContext = {
  params: Promise<{
    studentId: string;
  }>;
};

const apiFinanceService = new ApiFinanceService();

export const runtime = "nodejs";

export async function GET(request: Request, context: BalanceRouteContext) {
  const { studentId } = await context.params;

  return handleApiRead(request, "balances:read", async () =>
    apiSuccessResult(await apiFinanceService.getStudentBalance(studentId)),
  );
}

