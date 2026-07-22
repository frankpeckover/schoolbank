"use client";

import { useState } from "react";
import { logoutUser } from "@/lib/actions";
import type { SessionUser } from "@/lib/session";
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

  async function handleLogout() {
    await logoutUser();
    setUser(null);
  }

  if (user === null) {
    return (
      <LoginCard
        maintenanceMessage={maintenanceMessage}
        onLogin={setUser}
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
