import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import pg from "pg";

const { Pool } = pg;
const envPath = new URL("../.env.local", import.meta.url);

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([^#][^=]+)=(.*)$/);

    if (!match) {
      continue;
    }

    const [, name, rawValue] = match;
    process.env[name.trim()] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
}

const requiredEnvironmentVariables = [
  "POSTGRES_DATABASE",
  "POSTGRES_HOST",
  "POSTGRES_PASSWORD",
  "POSTGRES_USER",
];

for (const name of requiredEnvironmentVariables) {
  assert.ok(process.env[name], `${name} must be set for database smoke tests.`);
}

const pool = new Pool({
  database: process.env.POSTGRES_DATABASE,
  host: process.env.POSTGRES_HOST,
  password: process.env.POSTGRES_PASSWORD,
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  user: process.env.POSTGRES_USER,
});

try {
  const checks = {
    auditLogRows: await countRows("audit_log"),
    ledgerRows: await countRows("ledger_entries"),
    roles: await countRows("roles"),
    serverErrorLogRows: await countRows("server_error_log"),
    schoolInfo: await countRows("school_info"),
    users: await countRows("users"),
  };

  assert.equal(checks.schoolInfo, 1, "school_info should have exactly one row.");
  assert.ok(checks.roles >= 3, "roles should include the default roles.");
  assert.ok(checks.users >= 1, "users should include at least the admin user.");

  const adminResult = await pool.query(
    `
      select count(*)::int as count
      from users
      join roles on roles.id = users.role_id
      where users.username = 'admin'
        and roles.role_key = 'admin'
        and users.is_active = true
    `,
  );
  assert.equal(
    adminResult.rows[0].count,
    1,
    "An active admin user named admin should exist.",
  );

  const negativeBalanceResult = await pool.query(
    `
      select count(*)::int as count
      from (
        select
          accounts.user_id,
          coalesce(sum(ledger_entries.amount), 0) as balance
        from accounts
        left join ledger_entries
          on ledger_entries.account_id = accounts.id
          and ledger_entries.status in ('pending', 'posted')
          and not (
            ledger_entries.status = 'pending'
            and ledger_entries.is_voided = true
          )
        group by accounts.user_id
        having coalesce(sum(ledger_entries.amount), 0) < 0
      ) negative_balances
    `,
  );
  assert.equal(
    negativeBalanceResult.rows[0].count,
    0,
    "No account should have a negative available balance.",
  );

  console.log("Database smoke tests passed.", checks);
} finally {
  await pool.end();
}

async function countRows(tableName) {
  assert.match(tableName, /^[a-z_]+$/);

  const result = await pool.query(
    `select count(*)::int as count from ${tableName}`,
  );

  return result.rows[0].count;
}
