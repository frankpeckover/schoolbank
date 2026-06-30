import { db } from "@/lib/db";
import { appConfig } from "@/lib/app-config";
import { verifyPassword } from "@/lib/passwords";
import type { Role, SessionUser } from "@/lib/session";

type UserRow = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  role: Role;
  password_hash: string;
};

export type LoginResult =
  | {
      ok: true;
      user: SessionUser;
    }
  | {
      ok: false;
      message: string;
    };

export class AuthService {
  async login(username: string, password: string): Promise<LoginResult> {
    const normalizedUsername = username.trim().toLowerCase();

    if (!normalizedUsername || !password) {
      return {
        ok: false,
        message: "Enter your username and password.",
      };
    }

    try {
      const result = await db.query<UserRow>(
        `
          select
            users.id,
            users.username,
            users.first_name,
            users.last_name,
            roles.role_key as role,
            users.password_hash
          from users
          join roles on roles.id = users.role_id
          where lower(username) = $1
            and users.is_active = true
            and roles.is_active = true
          limit 1
        `,
        [normalizedUsername],
      );

      const user = result.rows[0];

      if (!user || !(await verifyPassword(password, user.password_hash))) {
        return {
          ok: false,
          message: "Username or password is incorrect.",
        };
      }

      return {
        ok: true,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
          displayName: formatDisplayName(user.first_name, user.last_name),
          role: user.role,
        },
      };
    } catch (error) {
      console.error("Database login failed", error);

      return {
        ok: false,
        message: `Could not connect to the ${appConfig.name} database. Check the PLATFORM_POSTGRES settings and organisation lookup row.`,
      };
    }
  }
}

function formatDisplayName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}
