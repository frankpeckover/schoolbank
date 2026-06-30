import { headers } from "next/headers";
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

type TenantDatabaseConfig = {
  database: string | undefined;
  host: string | undefined;
  password: string | undefined;
  port: number;
  slug: string;
  user: string | undefined;
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

const rootDomain = process.env.SCHOOLBANK_ROOT_DOMAIN ?? "schoolbank.com";
const localOrganisationSlug = process.env.LOCAL_ORGANISATION_SLUG ?? "local";
const defaultPostgresPort = 5432;

declare global {
  var schoolbankTenantPools: Map<string, Pool> | undefined;
  var schoolbankPlatformPool: Pool | undefined;
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
  const overrideSlug = requestHeaders.get("x-schoolbank-org");
  const host = getHostname(requestHeaders.get("host"));

  if (overrideSlug) {
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
  if (globalThis.schoolbankPlatformPool) {
    return globalThis.schoolbankPlatformPool;
  }

  const platformPool = new Pool({
    database: process.env.PLATFORM_POSTGRES_DATABASE,
    host: process.env.PLATFORM_POSTGRES_HOST,
    password: process.env.PLATFORM_POSTGRES_PASSWORD,
    port: Number(
      process.env.PLATFORM_POSTGRES_PORT ?? defaultPostgresPort,
    ),
    user: process.env.PLATFORM_POSTGRES_USER,
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis.schoolbankPlatformPool = platformPool;
  }

  return platformPool;
}

function getTenantPools() {
  if (!globalThis.schoolbankTenantPools) {
    globalThis.schoolbankTenantPools = new Map<string, Pool>();
  }

  return globalThis.schoolbankTenantPools;
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
