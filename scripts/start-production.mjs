#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadEnvironment } from "./env-file-loader.mjs";

const env = loadEnvironment();
const host = String(env.APP_HOST || "0.0.0.0").trim() || "0.0.0.0";
const port = getPort(env.APP_PORT || env.PORT || "3000");
const nextBinary = getNextBinaryPath();

if (!existsSync(".next/BUILD_ID")) {
  console.error(
    "Could not find a production build in .next. Run npm run build before npm run start.",
  );
  process.exit(1);
}

const child = spawn(
  nextBinary,
  ["start", "--hostname", host, "--port", String(port)],
  {
    env: {
      ...process.env,
      ...env,
      APP_HOST: host,
      APP_PORT: String(port),
      PORT: String(port),
    },
    shell: process.platform === "win32",
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

function getPort(value) {
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error("APP_PORT must be an integer between 1 and 65535.");
    process.exit(1);
  }

  return port;
}

function getNextBinaryPath() {
  return process.platform === "win32"
    ? join("node_modules", ".bin", "next.cmd")
    : join("node_modules", ".bin", "next");
}
