import { createHmac, randomUUID } from "crypto";
import { getRequiredServerEnvInProduction } from "@/lib/server-env";
import type { SessionUser } from "@/lib/session";

export type LockerLaunchTokenPayload = {
  aud: "locker-app";
  displayName: string;
  email: string;
  exp: number;
  firstName: string;
  iat: number;
  iss: "ledger-app";
  jti: string;
  lastName: string;
  profileImageUrl: string;
  role: SessionUser["role"];
  sub: string;
  username: string;
};

const tokenAlgorithm = "HS256";
const tokenType = "JWT";
const secondsPerMinute = 60;
const launchTokenLifetimeMinutes = 2;

export function createLockerLaunchToken(user: SessionUser) {
  const now = Math.floor(Date.now() / 1000);
  const payload: LockerLaunchTokenPayload = {
    aud: "locker-app",
    displayName: user.displayName,
    email: user.email,
    exp: now + launchTokenLifetimeMinutes * secondsPerMinute,
    firstName: user.firstName,
    iat: now,
    iss: "ledger-app",
    jti: randomUUID(),
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl,
    role: user.role,
    sub: user.id,
    username: user.username,
  };

  return signToken(payload);
}

function signToken(payload: LockerLaunchTokenPayload) {
  const header = {
    alg: tokenAlgorithm,
    typ: tokenType,
  };
  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", getLaunchTokenSecret())
    .update(unsignedToken)
    .digest("base64url");

  return `${unsignedToken}.${signature}`;
}

function getLaunchTokenSecret() {
  return getRequiredServerEnvInProduction(
    "MODULE_LAUNCH_TOKEN_SECRET",
    "development-module-launch-token-secret-change-me",
  );
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}
