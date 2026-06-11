"use client";

import { useEffect, useState } from "react";
import { AdminSettingsPanel } from "@/components/admin-settings-panel";
import { AdminUsersPanel } from "@/components/admin-users-panel";
import { AppNav, type NavigationItem } from "@/components/app-nav";
import { ShopPanel } from "@/components/shop/shop-panel";
import { StudentDashboardPanel } from "@/components/student-dashboard-panel";
import { TeacherDashboardPanel } from "@/components/teacher-dashboard-panel";
import { TransactionLogPanel } from "@/components/transactions/transaction-log-panel";
import { getSchoolInfo } from "@/lib/actions";
import { type SessionUser } from "@/lib/session";
import type { SchoolInfo } from "@/services/school-service";

type DashboardShellProps = {
  user: SessionUser;
  onLogout: () => void;
};

export function DashboardShell({
  user,
  onLogout,
}: DashboardShellProps) {
  const [activeNavItem, setActiveNavItem] =
    useState<NavigationItem>("Dashboard");
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({
    name: "SchoolBank School",
    address: "",
    planType: "trial",
    currencyName: "credits",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadSchoolInfo() {
      try {
        const loadedSchoolInfo = await getSchoolInfo();

        if (isMounted) {
          setSchoolInfo(loadedSchoolInfo);
        }
      } catch {
        // Keep the local fallback so the app still renders.
      }
    }

    loadSchoolInfo();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-kicker">
              SchoolBank
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
              {user.displayName}
            </h1>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <button
              className="rounded-md border border-button-border px-4 py-2 text-sm font-semibold text-text-control transition hover:bg-surface"
              onClick={onLogout}
              type="button"
            >
              Sign out
            </button>
          </div>
        </header>

        <AppNav
          activeItem={activeNavItem}
          onItemChange={setActiveNavItem}
          role={user.role}
        />

        {user.role === "admin" && activeNavItem === "Users" && (
          <AdminUsersPanel />
        )}

        {user.role === "teacher" && activeNavItem === "Dashboard" && (
          <TeacherDashboardPanel
            currencyName={schoolInfo.currencyName}
            currentUser={user}
          />
        )}

        {user.role === "student" && activeNavItem === "Dashboard" && (
          <StudentDashboardPanel
            currencyName={schoolInfo.currencyName}
            currentUser={user}
          />
        )}

        {activeNavItem === "Shop" && (
          <ShopPanel
            currencyName={schoolInfo.currencyName}
            currentUser={user}
          />
        )}

        {activeNavItem === "Transaction Log" && (
          <TransactionLogPanel
            currencyName={schoolInfo.currencyName}
            currentUser={user}
          />
        )}

        {user.role === "admin" && activeNavItem === "Settings" && (
          <AdminSettingsPanel onSchoolInfoUpdated={setSchoolInfo} />
        )}
      </div>
    </main>
  );
}
