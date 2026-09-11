import { createHash } from "crypto";
import { db } from "@/lib/db";

type ApiIdempotencyRow = {
  request_hash: string;
  response_body: unknown;
  status_code: number;
};

export type IdempotencyResult =
  | {
      responseBody: unknown;
      statusCode: number;
      type: "cached";
    }
  | {
      type: "conflict";
    }
  | {
      type: "new";
    };

const maxIdempotencyKeyLength = 128;

export class ApiIdempotencyService {
  async check(
    clientId: string,
    idempotencyKey: string,
    requestHash: string,
  ): Promise<IdempotencyResult> {
    const result = await db.query<ApiIdempotencyRow>(
      `
        select request_hash, response_body, status_code
        from api_idempotency_keys
        where client_id = $1
          and idempotency_key = $2
        limit 1
      `,
      [clientId, idempotencyKey],
    );
    const existing = result.rows[0];

    if (!existing) {
      return { type: "new" };
    }

    if (existing.request_hash !== requestHash) {
      return { type: "conflict" };
    }

    return {
      responseBody: existing.response_body,
      statusCode: existing.status_code,
      type: "cached",
    };
  }

  async record(
    clientId: string,
    idempotencyKey: string,
    requestHash: string,
    statusCode: number,
    responseBody: unknown,
  ) {
    await db.query(
      `
        insert into api_idempotency_keys (
          client_id,
          idempotency_key,
          request_hash,
          response_body,
          status_code
        )
        values ($1, $2, $3, $4::jsonb, $5)
        on conflict (client_id, idempotency_key) do nothing
      `,
      [
        clientId,
        idempotencyKey,
        requestHash,
        JSON.stringify(responseBody),
        statusCode,
      ],
    );
  }
}

export function getIdempotencyKey(request: Request) {
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() ?? "";

  if (!idempotencyKey || idempotencyKey.length > maxIdempotencyKeyLength) {
    return "";
  }

  return idempotencyKey;
}

export function hashApiRequest(request: Request, bodyText: string) {
  return createHash("sha256")
    .update(request.method)
    .update(":")
    .update(new URL(request.url).pathname)
    .update(":")
    .update(bodyText)
    .digest("hex");
}
