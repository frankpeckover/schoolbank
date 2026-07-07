"use server";

import { requireSchoolSettingsManager } from "@/lib/actions/action-auth";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { SsoProviderService } from "@/services/sso-provider-service";
import type { UpdateSsoProviderInput } from "@/services/sso-provider-service";

const ssoProviderService = new SsoProviderService();

export async function listSsoProviderSettings() {
  await requireSchoolSettingsManager();
  return ssoProviderService.listSettings();
}

export async function listEnabledSsoProviders() {
  await assertSameOriginRequest();
  return ssoProviderService.listEnabledForLogin();
}

export async function updateSsoProvider(input: UpdateSsoProviderInput) {
  const currentUser = await requireSchoolSettingsManager();
  return ssoProviderService.updateProvider(currentUser, input);
}

