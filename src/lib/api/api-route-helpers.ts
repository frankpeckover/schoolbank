import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/api-response";
import type {
  ApiClient,
  ApiFailure,
  ApiScope,
  ApiSuccess,
} from "@/lib/api/api-types";
import {
  ApiIdempotencyService,
  getIdempotencyKey,
  hashApiRequest,
} from "@/services/api-idempotency-service";
import { ApiClientService } from "@/services/api-client-service";
import { ApiFinanceError } from "@/services/api-finance-service";

export type ApiJsonBody = Record<string, unknown>;

export type ApiRouteResult<T = unknown> = {
  body: ApiFailure | ApiSuccess<T>;
  status: number;
};

type ApiReadHandler<T> = (
  apiClient: ApiClient,
) => Promise<ApiRouteResult<T>>;

type ApiWriteHandler<T> = (
  apiClient: ApiClient,
  body: ApiJsonBody,
) => Promise<ApiRouteResult<T>>;

const apiClientService = new ApiClientService();
const apiIdempotencyService = new ApiIdempotencyService();

export function apiSuccessResult<T>(
  data: T,
  status = 200,
): ApiRouteResult<T> {
  return {
    body: {
      data,
      ok: true,
    },
    status,
  };
}

export function apiErrorResult(
  code: string,
  message: string,
  status = 400,
): ApiRouteResult {
  return {
    body: {
      error: {
        code,
        message,
      },
      ok: false,
    },
    status,
  };
}

export async function handleApiRead<T>(
  request: Request,
  requiredScope: ApiScope,
  handler: ApiReadHandler<T>,
) {
  try {
    const apiClient = await authenticateApiClient(request, requiredScope);

    if (!apiClient) {
      return apiError("unauthorized", "Invalid API key or scope.", 401);
    }

    const result = await handler(apiClient);

    return toApiResponse(result);
  } catch (error) {
    if (error instanceof ApiFinanceError) {
      return apiError(error.code, error.message, error.status);
    }

    console.error("API read request failed", error);

    return apiError("server_error", "The API request could not be completed.", 500);
  }
}

export async function handleApiWrite<T>(
  request: Request,
  requiredScope: ApiScope,
  handler: ApiWriteHandler<T>,
) {
  try {
    const apiClient = await authenticateApiClient(request, requiredScope);

    if (!apiClient) {
      return apiError("unauthorized", "Invalid API key or scope.", 401);
    }

    const bodyText = await request.text();
    const bodyResult = parseJsonBody(bodyText);

    if (!bodyResult.ok) {
      return toApiResponse(bodyResult.result);
    }

    const idempotencyKey = getIdempotencyKey(request);

    if (!idempotencyKey) {
      return apiError(
        "idempotency_key_required",
        "Write requests require an Idempotency-Key header.",
        400,
      );
    }

    const requestHash = hashApiRequest(request, bodyText);
    const idempotencyResult = await apiIdempotencyService.check(
      apiClient.id,
      idempotencyKey,
      requestHash,
    );

    if (idempotencyResult.type === "cached") {
      return NextResponse.json(idempotencyResult.responseBody, {
        status: idempotencyResult.statusCode,
      });
    }

    if (idempotencyResult.type === "conflict") {
      return apiError(
        "idempotency_conflict",
        "This Idempotency-Key was already used for a different request.",
        409,
      );
    }

    const result = await handler(apiClient, bodyResult.body);

    await apiIdempotencyService.record(
      apiClient.id,
      idempotencyKey,
      requestHash,
      result.status,
      result.body,
    );

    return toApiResponse(result);
  } catch (error) {
    if (error instanceof ApiFinanceError) {
      return apiError(error.code, error.message, error.status);
    }

    console.error("API write request failed", error);

    return apiError("server_error", "The API request could not be completed.", 500);
  }
}

function toApiResponse<T>(result: ApiRouteResult<T>) {
  return NextResponse.json(result.body, { status: result.status });
}

async function authenticateApiClient(
  request: Request,
  requiredScope: ApiScope,
) {
  return apiClientService.authenticate(
    request.headers.get("authorization"),
    requiredScope,
  );
}

function parseJsonBody(
  bodyText: string,
): { body: ApiJsonBody; ok: true } | { ok: false; result: ApiRouteResult } {
  try {
    const body = bodyText ? JSON.parse(bodyText) : {};

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return {
        ok: false,
        result: apiErrorResult("invalid_json", "Request body must be a JSON object."),
      };
    }

    return { body: body as ApiJsonBody, ok: true };
  } catch {
    return {
      ok: false,
      result: apiErrorResult("invalid_json", "Request body is not valid JSON."),
    };
  }
}
