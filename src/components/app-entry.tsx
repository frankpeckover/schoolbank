"use client";

import { useEffect, useState } from "react";
import { logoutUser } from "@/lib/actions";
import { appConfig } from "@/lib/app-config";
import { isAdmin, isTeacher } from "@/lib/permissions";
import type { SessionUser } from "@/lib/session";
import { sessionExpiredEventName } from "@/lib/session-expiry-event";
import { DashboardShell } from "@/components/dashboard-shell";
import { LoginCard } from "@/components/login-card";
import { ToastViewport } from "@/components/ui/toast-viewport";

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
    document.title =
      user === null ? `Sign In | ${appConfig.name}` : getDashboardTitle(user);
  }, [user]);

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
      <>
        <ToastViewport />
        <LoginCard
          initialMessage={sessionMessage}
          initialMessageTone={sessionMessage ? "warning" : "success"}
          maintenanceMessage={maintenanceMessage}
          onLogin={handleLogin}
        />
      </>
    );
  }

  return (
    <>
      <ToastViewport />
      <DashboardShell
        maintenanceMessage={maintenanceMessage}
        onLogout={handleLogout}
        user={user}
      />
    </>
  );
}

function getDashboardTitle(user: SessionUser) {
  if (isAdmin(user)) {
    return `Admin Dashboard | ${appConfig.name}`;
  }

  if (isTeacher(user)) {
    return `Teacher Dashboard | ${appConfig.name}`;
  }

  return `Student Dashboard | ${appConfig.name}`;
}
