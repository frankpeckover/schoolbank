import { db } from "@/lib/db";
import { generateTemporaryPassword, hashPassword } from "@/lib/passwords";
import type { ActionResult } from "@/lib/action-results";
import type { Role } from "@/lib/session";
import { LedgerService } from "@/services/ledger-service";

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

export type ImportUserInput = Omit<CreateUserInput, "password">;

export type ImportUsersInput = {
  users: ImportUserInput[];
};

export type ImportUsersResult = {
  createdCount: number;
  createdUsers: ImportedUserCredential[];
  errors: ImportUserError[];
  ok: true;
};

export type ImportedUserCredential = {
  temporaryPassword: string;
  username: string;
};

export type ImportUserError = {
  message: string;
  rowNumber: number;
  username: string;
};

export type UpdateUserInput = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  isActive: boolean;
};

export type ResetUserPasswordInput = {
  id: string;
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

export type UserActionResult =
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

const ledgerService = new LedgerService();

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

    const client = await db.connect();

    try {
      const passwordHash = await hashPassword(password);

      await client.query("begin");

      const result = await client.query<UserListRow>(
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

      if (input.role === "student") {
        await ledgerService.ensureStudentAccount(client, result.rows[0].id);
      }

      await client.query("commit");

      return {
        ok: true,
        user: this.mapUserListRow(result.rows[0]),
      };
    } catch (error) {
      await client.query("rollback");
      console.error("Create user failed", error);

      return {
        ok: false,
        message: getCreateUserErrorMessage(error),
      };
    } finally {
      client.release();
    }
  }

  async importUsers(input: ImportUsersInput): Promise<ImportUsersResult> {
    const createdUsers: ImportedUserCredential[] = [];
    const errors: ImportUserError[] = [];
    let createdCount = 0;

    for (const [index, user] of input.users.entries()) {
      const rowNumber = index + 2;
      const temporaryPassword = generateTemporaryPassword();
      const result = await this.createUser({
        ...user,
        password: temporaryPassword,
      });

      if (result.ok) {
        createdCount += 1;
        createdUsers.push({
          temporaryPassword,
          username: result.user.username,
        });
      } else {
        errors.push({
          message: result.message,
          rowNumber,
          username: user.username,
        });
      }
    }

    return {
      createdCount,
      createdUsers,
      errors,
      ok: true,
    };
  }

  async updateUser(input: UpdateUserInput): Promise<UserActionResult> {
    const username = input.username.trim().toLowerCase();
    const firstName = capitaliseName(input.firstName);
    const lastName = capitaliseName(input.lastName);
    const email = input.email.trim().toLowerCase();

    if (!input.id || !username || !firstName || !lastName || !email) {
      return {
        ok: false,
        message: "Complete all user fields.",
      };
    }

    const client = await db.connect();

    try {
      await client.query("begin");

      const result = await client.query<UserListRow>(
        `
          update users
          set username = $1,
              first_name = $2,
              last_name = $3,
              email = $4,
              role = $5,
              is_active = $6,
              updated_at = now()
          where id = $7
          returning id, username, first_name, last_name, email, role, is_active
        `,
        [
          username,
          firstName,
          lastName,
          email,
          input.role,
          input.isActive,
          input.id,
        ],
      );

      const user = result.rows[0];

      if (!user) {
        await client.query("rollback");
        return {
          ok: false,
          message: "User was not found.",
        };
      }

      if (user.role === "student") {
        await ledgerService.ensureStudentAccount(client, user.id);
      }

      await client.query("commit");

      return {
        ok: true,
        user: this.mapUserListRow(user),
      };
    } catch (error) {
      await client.query("rollback");
      console.error("Update user failed", error);

      return {
        ok: false,
        message: "Could not update user.",
      };
    } finally {
      client.release();
    }
  }

  async resetPassword(input: ResetUserPasswordInput): Promise<ActionResult> {
    if (!input.id || !input.password) {
      return {
        ok: false,
        message: "Enter a new password.",
      };
    }

    try {
      const passwordHash = await hashPassword(input.password);
      const result = await db.query(
        `
          update users
          set password_hash = $1,
              updated_at = now()
          where id = $2
        `,
        [passwordHash, input.id],
      );

      if (result.rowCount === 0) {
        return {
          ok: false,
          message: "User was not found.",
        };
      }

      return { ok: true };
    } catch (error) {
      console.error("Reset password failed", error);

      return {
        ok: false,
        message: "Could not reset password.",
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

function getCreateUserErrorMessage(error: unknown) {
  const errorCode =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: string }).code
      : null;

  if (errorCode === "23505") {
    return "Username or email is already in use.";
  }

  return "Could not create user.";
}
