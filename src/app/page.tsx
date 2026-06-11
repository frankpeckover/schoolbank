"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { LoginCard } from "@/components/login-card";
import { type SessionUser } from "@/lib/session";

export default function Home() {
  const [user, setUser] = useState<SessionUser | null>(null);

  if (user === null) {
    return <LoginCard onLogin={setUser} />;
  }

  return (
    <DashboardShell
      user={user}
      onLogout={() => setUser(null)}
    />
  );
}
