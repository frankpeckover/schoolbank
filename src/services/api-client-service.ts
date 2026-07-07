import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import type { ApiClient, ApiScope } from "@/lib/api/api-types";

type ApiClientRow = {
  id: string;
  name: string;
  scopes: ApiScope[];
};

const bearerPrefix = "Bearer ";
const apiKeyBytes = 32;
const apiKeyPrefixLength = 12;

export class ApiClientService {
  async authenticate(
    authorizationHeader: string | null,
    requiredScope: ApiScope,
  ): Promise<ApiClient | null> {
    const apiKey = getBearerToken(authorizationHeader);

    if (!apiKey) {
      return null;
    }

    const result = await db.query<ApiClientRow>(
      `
        select
          api_clients.id,
          api_clients.name,
          coalesce(array_agg(api_client_scopes.scope), '{}') as scopes
        from api_clients
        join api_client_scopes on api_client_scopes.client_id = api_clients.id
        where api_clients.key_hash = $1
          and api_clients.is_active = true
        group by api_clients.id, api_clients.name
        limit 1
      `,
      [hashApiKey(apiKey)],
    );
    const client = result.rows[0];

    if (!client || !client.scopes.includes(requiredScope)) {
      return null;
    }

    return {
      id: client.id,
      name: client.name,
      scopes: client.scopes,
    };
  }
}

export function generateApiKey() {
  return `sbk_${randomBytes(apiKeyBytes).toString("base64url")}`;
}

export function getApiKeyPrefix(apiKey: string) {
  return apiKey.slice(0, apiKeyPrefixLength);
}

export function hashApiKey(apiKey: string) {
  return createHash("sha256").update(apiKey).digest("hex");
}

function getBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader?.startsWith(bearerPrefix)) {
    return "";
  }

  return authorizationHeader.slice(bearerPrefix.length).trim();
}
