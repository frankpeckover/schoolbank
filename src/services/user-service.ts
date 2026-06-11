import { db } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";
import type { ActionResult } from "@/lib/action-results";
import type { Role } from "@/lib/session";

export type UserListItem = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  role: Role;
  isActive: boolean;
};

export type CreateUserInput = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  password: string;
};

export type CreateUserResult =
  | {
      ok: true;
      user: UserListItem;
    }
  | {
      ok: false;
      message: string;
    };

export type StudentListItem = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  username: string;
};

type UserListRow = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  is_active: boolean;
};

type StudentListRow = {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
};

export class UserService {
  async listUsers(): Promise<UserListItem[]> {
    const result = await db.query<UserListRow>(`
      select id, username, first_name, last_name, email, role, is_active
      from users
      order by last_name, first_name
    `);

    return result.rows.map(this.mapUserListRow);
  }

  async listStudents(): Promise<StudentListItem[]> {
    const result = await db.query<StudentListRow>(`
      select id, first_name, last_name, username
      from users
      where role = 'student'
        and is_active = true
      order by last_name, first_name
    `);

    return result.rows.map((student) => ({
      id: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
      displayName: formatDisplayName(student.first_name, student.last_name),
      username: student.username,
    }));
  }

  async createUser(input: CreateUserInput): Promise<CreateUserResult> {
    const username = input.username.trim().toLowerCase();
    const firstName = capitaliseName(input.firstName);
    const lastName = capitaliseName(input.lastName);
    const email = input.email.trim().toLowerCase();
    const password = input.password;

    if (!username || !firstName || !lastName || !email || !password) {
      return {
        ok: false,
        message: "Complete all user fields.",
      };
    }

    try {
      const passwordHash = await hashPassword(password);
      const result = await db.query<UserListRow>(
        `
          insert into users (
            role,
            username,
            first_name,
            last_name,
            email,
            password_hash
          )
          values ($1, $2, $3, $4, $5, $6)
          returning id, username, first_name, last_name, email, role, is_active
        `,
        [input.role, username, firstName, lastName, email, passwordHash],
      );

      return {
        ok: true,
        user: this.mapUserListRow(result.rows[0]),
      };
    } catch (error) {
      console.error("Create user failed", error);

      return {
        ok: false,
        message: "Could not create user.",
      };
    }
  }

  async setUserActive(userId: string, isActive: boolean): Promise<ActionResult> {
    try {
      const result = await db.query(
        `
          update users
          set is_active = $1,
              updated_at = now()
          where id = $2
        `,
        [isActive, userId],
      );

      if (result.rowCount === 0) {
        return {
          ok: false,
          message: "User was not found.",
        };
      }

      return { ok: true };
    } catch (error) {
      console.error("Set user active failed", error);

      return {
        ok: false,
        message: "Could not update user status.",
      };
    }
  }

  private mapUserListRow(user: UserListRow): UserListItem {
    return {
      id: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      displayName: formatDisplayName(user.first_name, user.last_name),
      email: user.email,
      role: user.role,
      isActive: user.is_active,
    };
  }
}

function capitaliseName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDisplayName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}
