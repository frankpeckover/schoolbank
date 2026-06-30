import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { Role, SessionUser } from "@/lib/session";

type SessionUserRow = {
  first_name: string;
  id: string;
  last_name: string;
  role: Role;
  username: string;
};

const sessionCookieName = "schoolbank_session";
const sessionTokenBytes = 32;
const sessionLengthDays = 7;
const hoursPerDay = 24;
const minutesPerHour = 60;
const secondsPerMinute = 60;
const millisecondsPerSecond = 1000;
const sessionLengthMilliseconds =
  sessionLengthDays *
  hoursPerDay *
  minutesPerHour *
  secondsPerMinute *
  millisecondsPerSecond;

export class SessionService {
  async createSession(userId: string) {
    const token = randomBytes(sessionTokenBytes).toString("base64url");
    const expiresAt = new Date(Date.now() + sessionLengthMilliseconds);

    await db.query(
      `
        insert into user_sessions (user_id, token_hash, expires_at)
        values ($1, $2, $3)
      `,
      [userId, hashSessionToken(token), expiresAt],
    );

    const cookieStore = await cookies();
    cookieStore.set(sessionCookieName, token, {
      expires: expiresAt,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  async getCurrentUser(): Promise<SessionUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(sessionCookieName)?.value;

    if (!token) {
      return null;
    }

    try {
      const result = await db.query<SessionUserRow>(
        `
          select
            users.id,
            users.username,
            users.first_name,
            users.last_name,
            roles.role_key as role
          from user_sessions
          join users on users.id = user_sessions.user_id
          join roles on roles.id = users.role_id
          where user_sessions.token_hash = $1
            and user_sessions.expires_at > now()
            and users.is_active = true
            and roles.is_active = true
          limit 1
        `,
        [hashSessionToken(token)],
      );
      const user = result.rows[0];

      if (!user) {
        return null;
      }

      await db.query(
        `
          update user_sessions
          set last_seen_at = now()
          where token_hash = $1
        `,
        [hashSessionToken(token)],
      );

      return mapSessionUserRow(user);
    } catch (error) {
      console.error("Get current session failed", error);
      return null;
    }
  }

  async clearSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(sessionCookieName)?.value;

    if (token) {
      try {
        await db.query(
          `
            delete from user_sessions
            where token_hash = $1
          `,
          [hashSessionToken(token)],
        );
      } catch (error) {
        console.error("Clear session failed", error);
      }
    }

    cookieStore.delete(sessionCookieName);
  }
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function mapSessionUserRow(user: SessionUserRow): SessionUser {
  return {
    displayName: formatDisplayName(user.first_name, user.last_name),
    firstName: user.first_name,
    id: user.id,
    lastName: user.last_name,
    role: user.role,
    username: user.username,
  };
}

function formatDisplayName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}
