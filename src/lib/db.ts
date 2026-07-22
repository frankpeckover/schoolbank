import { headers } from "next/headers";
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import {
  getRequiredServerEnv,
  getRequiredServerEnvInProduction,
  getServerEnvNumber,
} from "@/lib/server-env";

type TenantDatabaseConfig = {
  database: string;
  host: string;
  password: string;
  port: number;
  slug: string;
  user: string;
};

type OrganisationDatabaseRow = {
  slug: string;
  database_host: string;
  database_port: number | null;
  database_name: string;
  database_user: string;
  database_password: string;
  is_active: boolean;
};

type TenantLookup = {
  host: string;
  slug: string;
};

const rootDomain = getRequiredServerEnvInProduction(
  "APP_ROOT_DOMAIN",
  "app.local",
);
const localOrganisationSlug = getRequiredServerEnvInProduction(
  "LOCAL_ORGANISATION_SLUG",
  "local",
);
const defaultPostgresPort = 5432;
const allowOrganisationHeaderOverride =
  process.env.NODE_ENV !== "production" ||
  process.env.ALLOW_ORGANISATION_HEADER_OVERRIDE === "true";

declare global {
  var appTenantPools: Map<string, Pool> | undefined;
  var appPlatformPool: Pool | undefined;
}

export const db = {
  async connect(): Promise<PoolClient> {
    const pool = await getTenantPool();

    return pool.connect();
  },

  async query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>> {
    const pool = await getTenantPool();

    return pool.query<Row>(text, values);
  },
};

async function getTenantPool() {
  const tenantConfig = await resolveTenantDatabaseConfig();
  const poolKey = getTenantPoolKey(tenantConfig);
  const pools = getTenantPools();
  const existingPool = pools.get(poolKey);

  if (existingPool) {
    return existingPool;
  }

  const pool = new Pool({
    database: tenantConfig.database,
    host: tenantConfig.host,
    password: tenantConfig.password,
    port: tenantConfig.port,
    user: tenantConfig.user,
  });

  pools.set(poolKey, pool);

  return pool;
}

async function resolveTenantDatabaseConfig(): Promise<TenantDatabaseConfig> {
  const tenantLookup = await resolveTenantLookup();

  return getOrganisationDatabaseConfig(tenantLookup);
}

async function resolveTenantLookup(): Promise<TenantLookup> {
  const requestHeaders = await headers();
  const overrideSlug = requestHeaders.get("x-organisation-slug");
  const host = getHostname(requestHeaders.get("host"));

  if (overrideSlug && allowOrganisationHeaderOverride) {
    return {
      host,
      slug: normaliseSlug(overrideSlug),
    };
  }

  return getTenantLookupFromHost(host);
}

function getTenantLookupFromHost(host: string): TenantLookup {
  if (isLocalHost(host)) {
    return {
      host,
      slug: localOrganisationSlug,
    };
  }

  if (host === rootDomain) {
    return {
      host,
      slug: localOrganisationSlug,
    };
  }

  if (host.endsWith(`.${rootDomain}`)) {
    return {
      host,
      slug: normaliseSlug(host.slice(0, -rootDomain.length - 1).split(".")[0]),
    };
  }

  return {
    host,
    slug: normaliseSlug(host),
  };
}

async function getOrganisationDatabaseConfig(lookup: TenantLookup) {
  const result = await getPlatformPool().query<OrganisationDatabaseRow>(
    `
      select slug,
             database_host,
             database_port,
             database_name,
             database_user,
             database_password,
             is_active
      from organisations
      where organisations.slug = $1
         or organisations.primary_domain = $2
      limit 1
    `,
    [lookup.slug, lookup.host],
  );
  const organisation = result.rows[0];

  if (!organisation || !organisation.is_active) {
    throw new Error(
      `No active organisation found for "${lookup.slug}" or "${lookup.host}".`,
    );
  }

  validateOrganisationDatabaseConfig(organisation);

  return {
    database: organisation.database_name,
    host: organisation.database_host,
    password: organisation.database_password,
    port: organisation.database_port ?? defaultPostgresPort,
    slug: organisation.slug,
    user: organisation.database_user,
  };
}

function getPlatformPool() {
  if (globalThis.appPlatformPool) {
    return globalThis.appPlatformPool;
  }

  const platformPool = new Pool({
    database: getRequiredServerEnv("PLATFORM_POSTGRES_DATABASE"),
    host: getRequiredServerEnv("PLATFORM_POSTGRES_HOST"),
    password: getRequiredServerEnv("PLATFORM_POSTGRES_PASSWORD"),
    port: getServerEnvNumber("PLATFORM_POSTGRES_PORT", defaultPostgresPort),
    user: getRequiredServerEnv("PLATFORM_POSTGRES_USER"),
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis.appPlatformPool = platformPool;
  }

  return platformPool;
}

function validateOrganisationDatabaseConfig(
  organisation: OrganisationDatabaseRow,
) {
  const missingFields = [
    ["database_host", organisation.database_host],
    ["database_name", organisation.database_name],
    ["database_user", organisation.database_user],
    ["database_password", organisation.database_password],
  ]
    .filter(([, value]) => !String(value ?? "").trim())
    .map(([field]) => field);

  if (missingFields.length > 0) {
    throw new Error(
      `Organisation "${organisation.slug}" is missing database settings: ${missingFields.join(", ")}.`,
    );
  }
}

function getTenantPools() {
  if (!globalThis.appTenantPools) {
    globalThis.appTenantPools = new Map<string, Pool>();
  }

  return globalThis.appTenantPools;
}

function getTenantPoolKey(config: TenantDatabaseConfig) {
  return [
    config.slug,
    config.host,
    config.port,
    config.database,
    config.user,
  ].join(":");
}

function getHostname(hostHeader: string | null) {
  return (hostHeader ?? "")
    .split(":")[0]
    .trim()
    .toLowerCase();
}

function isLocalHost(host: string) {
  return host === "" || host === "localhost" || host === "127.0.0.1";
}

function normaliseSlug(value: string) {
  return value.trim().toLowerCase();
}
