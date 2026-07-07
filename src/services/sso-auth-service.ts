import { createPublicKey, randomBytes, verify } from "crypto";
import { db } from "@/lib/db";
import { decryptServerSecret } from "@/lib/server-crypto";
import type { Role, SessionUser } from "@/lib/session";
import type { SsoProviderType } from "@/lib/sso-types";
import { AuditService } from "@/services/audit-service";

export type SsoAuthProvider = {
  allowedDomain: string;
  authorizationEndpoint: string;
  clientId: string;
  clientSecret: string;
  displayName: string;
  issuerUrl: string;
  jwksUri: string;
  providerType: SsoProviderType;
  tenantId: string;
  tokenEndpoint: string;
};

export type SsoState = {
  createdAt: number;
  nonce: string;
  providerType: SsoProviderType;
  redirectOrigin: string;
  state: string;
};

type SsoProviderRow = {
  allowed_domain: string;
  client_id: string;
  client_secret_encrypted: string;
  display_name: string;
  issuer_url: string;
  provider_type: SsoProviderType;
  tenant_id: string;
};

type SsoTokenResponse = {
  error?: string;
  error_description?: string;
  id_token?: string;
};

type JwtHeader = {
  alg?: string;
  kid?: string;
};

type Jwk = {
  alg?: string;
  kid?: string;
  kty?: string;
  use?: string;
};

type JwksResponse = {
  keys?: Jwk[];
};

type IdTokenClaims = {
  aud?: string | string[];
  email?: string;
  email_verified?: boolean;
  exp?: number;
  hd?: string;
  iss?: string;
  nonce?: string;
  preferred_username?: string;
  sub?: string;
  tid?: string;
  unique_name?: string;
  upn?: string;
};

type UserRow = {
  first_name: string;
  id: string;
  last_name: string;
  profile_image_url: string;
  role: Role;
  username: string;
};

const auditService = new AuditService();
const tokenGrantType = "authorization_code";
const idTokenAlgorithm = "RS256";
const openIdScope = "openid email profile";
const defaultGoogleIssuerUrl = "https://accounts.google.com";
const defaultMicrosoftIssuerBaseUrl = "https://login.microsoftonline.com";
const fetchTimeoutMilliseconds = 10_000;

export class SsoAuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class SsoAuthService {
  async getProviderForAuth(
    providerType: SsoProviderType,
  ): Promise<SsoAuthProvider | null> {
    const result = await db.query<SsoProviderRow>(
      `
        select
          provider_type,
          display_name,
          tenant_id,
          client_id,
          client_secret_encrypted,
          issuer_url,
          allowed_domain
        from sso_identity_providers
        where provider_type = $1
          and is_enabled = true
          and client_id <> ''
          and client_secret_encrypted <> ''
        limit 1
      `,
      [providerType],
    );
    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return buildProvider(row);
  }

  createState(providerType: SsoProviderType, redirectOrigin: string): SsoState {
    return {
      createdAt: Date.now(),
      nonce: randomBytes(24).toString("base64url"),
      providerType,
      redirectOrigin,
      state: randomBytes(24).toString("base64url"),
    };
  }

  buildAuthorizationUrl(
    provider: SsoAuthProvider,
    redirectUri: string,
    state: SsoState,
  ) {
    const url = new URL(provider.authorizationEndpoint);

    url.searchParams.set("client_id", provider.clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", openIdScope);
    url.searchParams.set("state", state.state);
    url.searchParams.set("nonce", state.nonce);

    if (provider.providerType === "google") {
      const [hostedDomain] = getAllowedDomains(provider.allowedDomain);

      if (hostedDomain) {
        url.searchParams.set("hd", hostedDomain);
      }
    }

    if (provider.providerType === "microsoft_entra") {
      url.searchParams.set("prompt", "select_account");
    }

    return url;
  }

  async completeSignIn(input: {
    code: string;
    provider: SsoAuthProvider;
    redirectUri: string;
    state: SsoState;
  }) {
    const tokenResponse = await exchangeAuthorizationCode(input);
    const idToken = tokenResponse.id_token;

    if (!idToken) {
      throw new SsoAuthError(
        "missing_id_token",
        "The SSO provider did not return an ID token.",
      );
    }

    const claims = await verifyIdToken(
      idToken,
      input.provider,
      input.state.nonce,
    );
    const email = getVerifiedEmail(claims, input.provider);

    const user = await findActiveUserByEmail(email);

    if (!user) {
      await logSsoEvent({
        action: "auth.sso_login_unmatched",
        details: {
          email,
          providerType: input.provider.providerType,
        },
      });

      return {
        email,
        ok: false as const,
        reason: "account_required" as const,
      };
    }

    await logSsoEvent({
      action: "auth.sso_login_success",
      actorUserId: user.id,
      details: {
        email,
        providerType: input.provider.providerType,
        username: user.username,
      },
      entityId: user.id,
    });

    return {
      ok: true as const,
      user,
    };
  }
}

function buildProvider(row: SsoProviderRow): SsoAuthProvider {
  const issuerUrl = getIssuerUrl(row);

  return {
    allowedDomain: row.allowed_domain,
    authorizationEndpoint: getAuthorizationEndpoint(row),
    clientId: row.client_id,
    clientSecret: decryptServerSecret(row.client_secret_encrypted),
    displayName: row.display_name,
    issuerUrl,
    jwksUri: getJwksUri(row),
    providerType: row.provider_type,
    tenantId: row.tenant_id,
    tokenEndpoint: getTokenEndpoint(row),
  };
}

function getAuthorizationEndpoint(row: SsoProviderRow) {
  if (row.provider_type === "google") {
    return "https://accounts.google.com/o/oauth2/v2/auth";
  }

  return `${defaultMicrosoftIssuerBaseUrl}/${row.tenant_id}/oauth2/v2.0/authorize`;
}

function getTokenEndpoint(row: SsoProviderRow) {
  if (row.provider_type === "google") {
    return "https://oauth2.googleapis.com/token";
  }

  return `${defaultMicrosoftIssuerBaseUrl}/${row.tenant_id}/oauth2/v2.0/token`;
}

function getJwksUri(row: SsoProviderRow) {
  if (row.provider_type === "google") {
    return "https://www.googleapis.com/oauth2/v3/certs";
  }

  return `${defaultMicrosoftIssuerBaseUrl}/${row.tenant_id}/discovery/v2.0/keys`;
}

function getDefaultIssuerUrl(row: SsoProviderRow) {
  if (row.provider_type === "google") {
    return defaultGoogleIssuerUrl;
  }

  return `${defaultMicrosoftIssuerBaseUrl}/${row.tenant_id}/v2.0`;
}

function getIssuerUrl(row: SsoProviderRow) {
  if (row.provider_type === "microsoft_entra") {
    const issuerUrl = row.issuer_url.trim();

    if (!issuerUrl || issuerUrl === defaultMicrosoftIssuerBaseUrl) {
      return getDefaultIssuerUrl(row);
    }

    return issuerUrl;
  }

  return row.issuer_url || getDefaultIssuerUrl(row);
}

async function exchangeAuthorizationCode(input: {
  code: string;
  provider: SsoAuthProvider;
  redirectUri: string;
}) {
  const response = await fetch(input.provider.tokenEndpoint, {
    body: new URLSearchParams({
      client_id: input.provider.clientId,
      client_secret: input.provider.clientSecret,
      code: input.code,
      grant_type: tokenGrantType,
      redirect_uri: input.redirectUri,
    }),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    signal: AbortSignal.timeout(fetchTimeoutMilliseconds),
  });
  const tokenResponse = (await response.json()) as SsoTokenResponse;

  if (!response.ok || tokenResponse.error) {
    throw new SsoAuthError(
      "token_exchange_failed",
      tokenResponse.error_description ||
        tokenResponse.error ||
        "The SSO token exchange failed.",
    );
  }

  return tokenResponse;
}

async function verifyIdToken(
  idToken: string,
  provider: SsoAuthProvider,
  expectedNonce: string,
) {
  const [encodedHeader, encodedPayload, encodedSignature] = idToken.split(".");

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new SsoAuthError("invalid_id_token", "The SSO ID token is not valid.");
  }

  const header = decodeJwtPart<JwtHeader>(encodedHeader);
  const claims = decodeJwtPart<IdTokenClaims>(encodedPayload);

  if (header.alg !== idTokenAlgorithm || !header.kid) {
    throw new SsoAuthError(
      "unsupported_token_algorithm",
      "The SSO ID token algorithm is not supported.",
    );
  }

  await verifyJwtSignature(
    `${encodedHeader}.${encodedPayload}`,
    encodedSignature,
    header,
    provider,
  );
  validateClaims(claims, provider, expectedNonce);

  return claims;
}

async function verifyJwtSignature(
  signingInput: string,
  encodedSignature: string,
  header: JwtHeader,
  provider: SsoAuthProvider,
) {
  const jwk = await getSigningKey(provider, header.kid ?? "");
  const publicKey = createPublicKey({
    format: "jwk",
    key: jwk,
  });
  const isValid = verify(
    "RSA-SHA256",
    Buffer.from(signingInput),
    publicKey,
    base64UrlToBuffer(encodedSignature),
  );

  if (!isValid) {
    throw new SsoAuthError(
      "invalid_token_signature",
      "The SSO ID token signature is not valid.",
    );
  }
}

async function getSigningKey(provider: SsoAuthProvider, keyId: string) {
  const response = await fetch(provider.jwksUri, {
    signal: AbortSignal.timeout(fetchTimeoutMilliseconds),
  });

  if (!response.ok) {
    throw new SsoAuthError(
      "signing_keys_unavailable",
      "Could not load SSO signing keys.",
    );
  }

  const jwks = (await response.json()) as JwksResponse;
  const jwk = jwks.keys?.find((key) => key.kid === keyId);

  if (!jwk) {
    throw new SsoAuthError(
      "signing_key_not_found",
      "The SSO signing key was not found.",
    );
  }

  return jwk;
}

function validateClaims(
  claims: IdTokenClaims,
  provider: SsoAuthProvider,
  expectedNonce: string,
) {
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (!claims.exp || claims.exp <= nowSeconds) {
    throw new SsoAuthError("expired_token", "The SSO ID token has expired.");
  }

  if (!isValidAudience(claims.aud, provider.clientId)) {
    throw new SsoAuthError(
      "invalid_audience",
      "The SSO ID token audience is not valid.",
    );
  }

  if (claims.nonce !== expectedNonce) {
    throw new SsoAuthError("invalid_nonce", "The SSO ID token nonce is not valid.");
  }

  if (!isValidIssuer(claims, provider)) {
    throw new SsoAuthError("invalid_issuer", "The SSO ID token issuer is not valid.");
  }

  if (
    provider.providerType === "microsoft_entra" &&
    provider.tenantId &&
    claims.tid !== provider.tenantId
  ) {
    throw new SsoAuthError(
      "tenant_mismatch",
      "The Microsoft tenant did not match this school.",
    );
  }
}

function isValidIssuer(claims: IdTokenClaims, provider: SsoAuthProvider) {
  if (!claims.iss) {
    return false;
  }

  if (provider.providerType === "google") {
    return claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  }

  return (
    claims.iss === provider.issuerUrl ||
    claims.iss === `${defaultMicrosoftIssuerBaseUrl}/${provider.tenantId}/v2.0`
  );
}

function getVerifiedEmail(
  claims: IdTokenClaims,
  provider: SsoAuthProvider,
) {
  const email = getEmailClaim(claims, provider)
    .trim()
    .toLowerCase();

  if (!email) {
    throw new SsoAuthError(
      "missing_email",
      "The SSO account did not provide an email address.",
    );
  }

  if (provider.providerType === "google" && claims.email_verified !== true) {
    throw new SsoAuthError(
      "unverified_email",
      "The Google account did not provide a verified email.",
    );
  }

  const allowedDomains = getAllowedDomains(provider.allowedDomain);

  if (
    allowedDomains.length > 0 &&
    !allowedDomains.some((domain) => email.endsWith(`@${domain}`))
  ) {
    throw new SsoAuthError(
      "email_domain_mismatch",
      "The SSO email domain does not match this school.",
    );
  }

  if (
    provider.providerType === "google" &&
    allowedDomains.length > 0 &&
    !claims.hd
  ) {
    throw new SsoAuthError(
      "hosted_domain_missing",
      "The Google account did not include a Workspace hosted domain.",
    );
  }

  if (
    provider.providerType === "google" &&
    allowedDomains.length > 0 &&
    claims.hd &&
    !allowedDomains.includes(claims.hd.toLowerCase())
  ) {
    throw new SsoAuthError(
      "hosted_domain_mismatch",
      "The Google Workspace domain does not match this school.",
    );
  }

  return email;
}

function getAllowedDomains(value: string) {
  return value
    .split(/[\n,;]+/)
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
}

function isValidAudience(audience: string | string[] | undefined, clientId: string) {
  if (Array.isArray(audience)) {
    return audience.includes(clientId);
  }

  return audience === clientId;
}

function getEmailClaim(claims: IdTokenClaims, provider: SsoAuthProvider) {
  if (provider.providerType === "google") {
    return claims.email ?? "";
  }

  return (
    claims.email ||
    claims.preferred_username ||
    claims.upn ||
    claims.unique_name ||
    ""
  );
}

async function findActiveUserByEmail(email: string): Promise<SessionUser | null> {
  const result = await db.query<UserRow>(
    `
      select
        users.id,
        users.username,
        users.first_name,
        users.last_name,
        users.profile_image_url,
        roles.role_key as role
      from users
      join roles on roles.id = users.role_id
      where lower(users.email) = $1
        and users.is_active = true
        and roles.is_active = true
      limit 1
    `,
    [email],
  );
  const user = result.rows[0];

  if (!user) {
    return null;
  }

  return {
    displayName: `${user.first_name} ${user.last_name}`.trim(),
    firstName: user.first_name,
    id: user.id,
    lastName: user.last_name,
    profileImageUrl: user.profile_image_url,
    role: user.role,
    username: user.username,
  };
}

async function logSsoEvent(input: {
  action: string;
  actorUserId?: string;
  details: Record<string, unknown>;
  entityId?: string;
}) {
  try {
    await auditService.log({
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      details: input.details,
      entityId: input.entityId ?? null,
      entityType: "auth",
    });
  } catch (error) {
    console.error("SSO audit log failed", error);
  }
}

function decodeJwtPart<T>(value: string): T {
  return JSON.parse(base64UrlToBuffer(value).toString("utf8")) as T;
}

function base64UrlToBuffer(value: string) {
  return Buffer.from(value, "base64url");
}
