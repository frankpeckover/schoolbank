import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const envFileNames = [
  ".env",
  ".env.production",
  ".env.local",
  ".env.production.local",
];

export function loadEnvironment() {
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

export function parseEnvFile(filePath) {
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
