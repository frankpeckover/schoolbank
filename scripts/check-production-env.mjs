#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envFileNames = [
  ".env",
  ".env.production",
  ".env.local",
  ".env.production.local",
];

const requiredVariables = [
  "APP_BASE_URL",
  "APP_ROOT_DOMAIN",
  "LOCAL_ORGANISATION_SLUG",
  "PLATFORM_POSTGRES_DATABASE",
  "PLATFORM_POSTGRES_HOST",
  "PLATFORM_POSTGRES_PASSWORD",
  "PLATFORM_POSTGRES_PORT",
  "PLATFORM_POSTGRES_USER",
  "SESSION_TOKEN_HASH_SECRET",
  "SSO_SECRET_ENCRYPTION_KEY",
  "API_KEY_HASH_SECRET",
];

const schemaTenantVariables = [
  "APP_POSTGRES_DATABASE",
  "APP_POSTGRES_HOST",
  "APP_POSTGRES_PASSWORD",
  "APP_POSTGRES_PORT",
  "APP_POSTGRES_USER",
];

const recommendedVariables = [
  "EMAIL_FROM",
  "NEXT_PUBLIC_APP_DESCRIPTION",
  "NEXT_PUBLIC_APP_INITIALS",
  "NEXT_PUBLIC_APP_LOCKUP_URL",
  "NEXT_PUBLIC_APP_LOGO_URL",
  "NEXT_PUBLIC_APP_NAME",
  "NEXT_PUBLIC_APP_SUPPORT_EMAIL",
  "NEXT_PUBLIC_APP_TAGLINE",
  "NEXT_PUBLIC_APP_VERSION",
  "NEXT_PUBLIC_APP_WORDMARK_URL",
  "RESEND_API_KEY",
];

const env = loadEnvironment();
const missingRequired = getMissingVariables(requiredVariables, env);
const missingSchema = getMissingVariables(schemaTenantVariables, env);
const missingRecommended = getMissingVariables(recommendedVariables, env);

if (missingRequired.length > 0 || missingSchema.length > 0) {
  console.error("Production environment is not ready.");

  if (missingRequired.length > 0) {
    console.error(`Missing required variables: ${missingRequired.join(", ")}`);
  }

  if (missingSchema.length > 0) {
    console.error(
      `Missing schema tenancy variables: ${missingSchema.join(", ")}`,
    );
    console.error(
      "These are required when any organisation uses tenancy_mode = 'schema'.",
    );
  }

  process.exit(1);
}

if (missingRecommended.length > 0) {
  console.warn(`Recommended variables not set: ${missingRecommended.join(", ")}`);
}

console.log("Production environment check passed.");

function loadEnvironment() {
  const loadedEnv = { ...process.env };

  for (const fileName of envFileNames) {
    const filePath = resolve(process.cwd(), fileName);

    if (!existsSync(filePath)) {
      continue;
    }

    Object.assign(loadedEnv, parseEnvFile(filePath));
  }

  return loadedEnv;
}

function parseEnvFile(filePath) {
  const parsed = {};
  const content = readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();

    parsed[key] = stripWrappingQuotes(value);
  }

  return parsed;
}

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function getMissingVariables(variableNames, env) {
  return variableNames.filter((name) => !String(env[name] ?? "").trim());
}
