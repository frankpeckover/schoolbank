import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function readProjectFile(path) {
  return readFileSync(join(projectRoot, path), "utf8");
}

function assertContains(content, expected, label) {
  assert.ok(
    content.includes(expected),
    `${label} should contain: ${expected}`,
  );
}

const packageJson = JSON.parse(readProjectFile("package.json"));
const schoolSql = readProjectFile("database/create-school-database.sql");
const platformSql = readProjectFile("database/create-platform-database.sql");
const userCsvHeader = readProjectFile("test-users-import.csv").split(/\r?\n/)[0];
const groupCsvHeader = readProjectFile("test-groups-import.csv").split(/\r?\n/)[0];

assert.equal(packageJson.private, true, "Package should remain private.");
assert.equal(
  userCsvHeader,
  "username,first_name,last_name,email,role",
  "User import CSV should not include passwords.",
);
assert.equal(
  groupCsvHeader,
  "group_name,username,description",
  "Group import CSV header should match the importer.",
);

[
  "create table if not exists school_info",
  "create table if not exists roles",
  "create table if not exists role_permissions",
  "create table if not exists users",
  "create table if not exists accounts",
  "create table if not exists student_groups",
  "create table if not exists student_group_memberships",
  "create table if not exists shop_items",
  "create table if not exists shop_purchases",
  "create table if not exists ledger_entries",
  "create table if not exists audit_log",
  "create table if not exists server_error_log",
  "create table if not exists student_goals",
  "create table if not exists term_deposit_settings",
  "create table if not exists student_term_deposits",
  "insert into users",
  "'admin'",
].forEach((expected) => assertContains(schoolSql, expected, "School schema"));

[
  "create table if not exists organisations",
  "insert into organisations",
  "database_password",
].forEach((expected) =>
  assertContains(platformSql, expected, "Platform schema"),
);

console.log("Static smoke tests passed.");
