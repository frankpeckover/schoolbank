export type Role = "teacher" | "student" | "admin";

export type SessionUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  displayName: string;
  profileImageUrl: string;
  role: Role;
};
