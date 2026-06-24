"use server";

import {
  requireSchoolSettingsManager,
  requireUser,
} from "@/lib/actions/action-auth";
import { SchoolService } from "@/services/school-service";
import type { UpdateSchoolInfoInput } from "@/services/school-service";

const schoolService = new SchoolService();

export async function getSchoolInfo() {
  return schoolService.getSchoolInfo();
}

export async function updateSchoolInfo(input: UpdateSchoolInfoInput) {
  const currentUser = await requireSchoolSettingsManager();
  return schoolService.updateSchoolInfo(currentUser, input);
}

export async function uploadSchoolLogo(formData: FormData) {
  await requireSchoolSettingsManager();

  const file = formData.get("logo");

  if (!(file instanceof File)) {
    return {
      ok: false as const,
      message: "Choose a logo file.",
    };
  }

  return schoolService.uploadLogo(file);
}

export async function ensureAuthenticated() {
  return requireUser();
}
