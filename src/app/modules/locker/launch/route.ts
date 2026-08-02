import { NextResponse } from "next/server";
import { createLockerLaunchToken } from "@/lib/module-launch-token";
import { getRequiredServerEnvInProduction } from "@/lib/server-env";
import { SessionService } from "@/services/session-service";

const sessionService = new SessionService();

export async function GET() {
  const currentUser = await sessionService.getCurrentUser();

  if (!currentUser) {
    return NextResponse.redirect(new URL("/", getMainAppFallbackUrl()));
  }

  const launchUrl = new URL("/launch", getLockerAppUrl());
  launchUrl.searchParams.set("token", createLockerLaunchToken(currentUser));

  return NextResponse.redirect(launchUrl);
}

function getMainAppFallbackUrl() {
  return getRequiredServerEnvInProduction("APP_BASE_URL", "http://localhost:3000");
}

function getLockerAppUrl() {
  return getRequiredServerEnvInProduction("LOCKER_APP_URL", "http://localhost:3001");
}
