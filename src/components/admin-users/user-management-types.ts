import type { Role } from "@/lib/session";

export const userRoles: Role[] = ["admin", "teacher", "student"];

export type UserFilters = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: "" | Role;
};

export const emptyFilters: UserFilters = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  role: "",
};
