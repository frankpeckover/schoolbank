"use server";

import { requireUser } from "@/lib/actions/action-auth";
import type { SaveStudentGoalInput } from "@/domains/analytics/student-goal-service";
import { StudentGoalService } from "@/domains/analytics/student-goal-service";

const studentGoalService = new StudentGoalService();

export async function getStudentGoal() {
  const currentUser = await requireUser();
  return studentGoalService.getGoal(currentUser.id);
}

export async function saveStudentGoal(input: SaveStudentGoalInput) {
  const currentUser = await requireUser();
  return studentGoalService.saveGoal(currentUser, input);
}
