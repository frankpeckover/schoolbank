import { db } from "@/lib/db";
import {
  generateTemporaryPassword,
  hashPassword,
  verifyPassword,
} from "@/lib/passwords";
import type { ActionResult } from "@/lib/action-results";
import type { Role, SessionUser } from "@/lib/session";
import { AuditService } from "@/services/audit-service";
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

export type ChangeOwnPasswordInput = {
  currentPassword: string;
  newPassword: string;
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
const auditService = new AuditService();
const defaultStudentSearchLimit = 12;

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
    return this.searchStudents("", defaultStudentSearchLimit);
  }

  async searchStudents(
    searchTerm: string,
    limit = defaultStudentSearchLimit,
  ): Promise<StudentListItem[]> {
    const normalizedSearchTerm = `%${searchTerm.trim().toLowerCase()}%`;
    const result = await db.query<StudentListRow>(`
      select id, first_name, last_name, username
      from users
      where role = 'student'
        and is_active = true
        and (
          $1 = '%%'
          or lower(first_name) like $1
          or lower(last_name) like $1
          or lower(username) like $1
          or lower(first_name || ' ' || last_name) like $1
        )
      order by last_name, first_name
      limit $2
    `, [normalizedSearchTerm, limit]);

    return result.rows.map((student) => ({
      id: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
      displayName: formatDisplayName(student.first_name, student.last_name),
      username: student.username,
    }));
  }

  async createUser(
    input: CreateUserInput,
    currentUser?: SessionUser,
  ): Promise<CreateUserResult> {
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

      await auditService.logWithClient(client, {
        action: "user.created",
        actorUserId: currentUser?.id,
        details: {
          role: input.role,
          username,
        },
        entityId: result.rows[0].id,
        entityType: "user",
      });

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

  async importUsers(
    input: ImportUsersInput,
    currentUser?: SessionUser,
  ): Promise<ImportUsersResult> {
    const createdUsers: ImportedUserCredential[] = [];
    const errors: ImportUserError[] = [];
    let createdCount = 0;

    for (const [index, user] of input.users.entries()) {
      const rowNumber = index + 2;
      const temporaryPassword = generateTemporaryPassword();
      const result = await this.createUser({
        ...user,
        password: temporaryPassword,
      }, currentUser);

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

  async updateUser(
    input: UpdateUserInput,
    currentUser?: SessionUser,
  ): Promise<UserActionResult> {
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

      await auditService.logWithClient(client, {
        action: "user.updated",
        actorUserId: currentUser?.id,
        details: {
          email,
          isActive: input.isActive,
          role: input.role,
          username,
        },
        entityId: user.id,
        entityType: "user",
      });

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

  async resetPassword(
    input: ResetUserPasswordInput,
    currentUser?: SessionUser,
  ): Promise<ActionResult> {
    if (!input.id || !input.password) {
      return {
        ok: false,
        message: "Enter a new password.",
      };
    }

    const client = await db.connect();

    try {
      const passwordHash = await hashPassword(input.password);
      await client.query("begin");

      const result = await client.query(
        `
          update users
          set password_hash = $1,
              updated_at = now()
          where id = $2
        `,
        [passwordHash, input.id],
      );

      if (result.rowCount === 0) {
        await client.query("rollback");
        return {
          ok: false,
          message: "User was not found.",
        };
      }

      await auditService.logWithClient(client, {
        action: "user.password_reset",
        actorUserId: currentUser?.id,
        entityId: input.id,
        entityType: "user",
      });

      await client.query("commit");
      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Reset password failed", error);

      return {
        ok: false,
        message: "Could not reset password.",
      };
    } finally {
      client.release();
    }
  }

  async changeOwnPassword(
    currentUser: SessionUser,
    input: ChangeOwnPasswordInput,
  ): Promise<ActionResult> {
    if (!input.currentPassword || !input.newPassword) {
      return {
        ok: false,
        message: "Enter your current password and a new password.",
      };
    }

    if (input.newPassword.length < 8) {
      return {
        ok: false,
        message: "New password must be at least 8 characters.",
      };
    }

    const client = await db.connect();

    try {
      await client.query("begin");

      const currentPasswordResult = await client.query<{
        password_hash: string;
      }>(
        `
          select password_hash
          from users
          where id = $1
            and is_active = true
          for update
        `,
        [currentUser.id],
      );

      const passwordHash = currentPasswordResult.rows[0]?.password_hash;

      if (
        !passwordHash ||
        !(await verifyPassword(input.currentPassword, passwordHash))
      ) {
        await client.query("rollback");
        return {
          ok: false,
          message: "Current password is incorrect.",
        };
      }

      const newPasswordHash = await hashPassword(input.newPassword);

      await client.query(
        `
          update users
          set password_hash = $1,
              updated_at = now()
          where id = $2
        `,
        [newPasswordHash, currentUser.id],
      );

      await auditService.logWithClient(client, {
        action: "user.password_changed",
        actorUserId: currentUser.id,
        entityId: currentUser.id,
        entityType: "user",
      });

      await client.query("commit");
      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Change own password failed", error);

      return {
        ok: false,
        message: "Could not change password.",
      };
    } finally {
      client.release();
    }
  }

  async setUserActive(
    userId: string,
    isActive: boolean,
    currentUser?: SessionUser,
  ): Promise<ActionResult> {
    const client = await db.connect();

    try {
      await client.query("begin");

      const result = await client.query(
        `
          update users
          set is_active = $1,
              updated_at = now()
          where id = $2
        `,
        [isActive, userId],
      );

      if (result.rowCount === 0) {
        await client.query("rollback");
        return {
          ok: false,
          message: "User was not found.",
        };
      }

      await auditService.logWithClient(client, {
        action: isActive ? "user.enabled" : "user.disabled",
        actorUserId: currentUser?.id,
        entityId: userId,
        entityType: "user",
      });

      await client.query("commit");
      return { ok: true };
    } catch (error) {
      await client.query("rollback");
      console.error("Set user active failed", error);

      return {
        ok: false,
        message: "Could not update user status.",
      };
    } finally {
      client.release();
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
