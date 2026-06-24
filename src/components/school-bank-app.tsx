"use client";

import { useState } from "react";
import { logoutUser } from "@/lib/actions";
import type { SessionUser } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard-shell";
import { LoginCard } from "@/components/login-card";

type SchoolBankAppProps = {
  initialUser: SessionUser | null;
};

export function SchoolBankApp({ initialUser }: SchoolBankAppProps) {
  const [user, setUser] = useState<SessionUser | null>(initialUser);

  async function handleLogout() {
    await logoutUser();
    setUser(null);
  }

  if (user === null) {
    return <LoginCard onLogin={setUser} />;
  }

  return <DashboardShell user={user} onLogout={handleLogout} />;
}
