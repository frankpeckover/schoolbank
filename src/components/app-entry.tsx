"use client";

import { useEffect, useState } from "react";
import { logoutUser } from "@/lib/actions";
import type { SessionUser } from "@/lib/session";
import { sessionExpiredEventName } from "@/lib/session-expiry-event";
import { DashboardShell } from "@/components/dashboard-shell";
import { LoginCard } from "@/components/login-card";

type AppEntryProps = {
  initialUser: SessionUser | null;
  maintenanceMessage: string;
};

export function AppEntry({
  initialUser,
  maintenanceMessage,
}: AppEntryProps) {
  const [user, setUser] = useState<SessionUser | null>(initialUser);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  useEffect(() => {
    function handleSessionExpired() {
      setUser((currentUser) => {
        if (currentUser) {
          setSessionMessage("Your session has expired. Please sign in again.");
        }

        return null;
      });
    }

    window.addEventListener(sessionExpiredEventName, handleSessionExpired);

    return () => {
      window.removeEventListener(sessionExpiredEventName, handleSessionExpired);
    };
  }, []);

  async function handleLogout() {
    await logoutUser();
    setSessionMessage(null);
    setUser(null);
  }

  function handleLogin(nextUser: SessionUser) {
    setSessionMessage(null);
    setUser(nextUser);
  }

  if (user === null) {
    return (
      <LoginCard
        initialMessage={sessionMessage}
        maintenanceMessage={maintenanceMessage}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <DashboardShell
      maintenanceMessage={maintenanceMessage}
      onLogout={handleLogout}
      user={user}
    />
  );
}
