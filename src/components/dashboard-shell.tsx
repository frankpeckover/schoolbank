"use client";

import { useEffect, useState } from "react";
import { AdminAuditLogPanel } from "@/components/admin-audit-log-panel";
import { AdminDashboardPanel } from "@/components/admin-dashboard-panel";
import { AdminGroupsPanel } from "@/components/admin-groups-panel";
import { AdminSettingsPanel } from "@/components/admin-settings-panel";
import { AdminUsersPanel } from "@/components/admin-users-panel";
import {
  HeaderNavMenu,
  type NavigationItem,
} from "@/components/app-nav";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { ShopPanel } from "@/components/shop/shop-panel";
import { StudentDashboardPanel } from "@/components/student-dashboard-panel";
import { TeacherDashboardPanel } from "@/components/teacher-dashboard-panel";
import { TransactionLogPanel } from "@/components/transactions/transaction-log-panel";
import { SchoolLogo } from "@/components/ui/school-logo";
import { getSchoolInfo } from "@/lib/actions";
import { appConfig } from "@/lib/app-config";
import { defaultCurrencyName } from "@/lib/school-defaults";
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
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({
    name: appConfig.defaultSchoolName,
    address: "",
    contactEmail: "",
    planType: "trial",
    currencyName: defaultCurrencyName,
    logoUrl: "",
    phone: "",
    website: "",
    timezone: "",
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
        <header className="flex items-start justify-between gap-3 border-b border-border pb-3 sm:items-center sm:pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <SchoolLogo logoUrl={schoolInfo.logoUrl} name={schoolInfo.name} />
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-kicker">
                {appConfig.name}
              </p>
              <h1 className="mt-1 truncate text-2xl font-semibold tracking-normal text-foreground sm:text-4xl">
                Hello, {user.displayName}
              </h1>
            </div>
          </div>
          <HeaderNavMenu
            activeItem={activeNavItem}
            onItemChange={setActiveNavItem}
            onLogout={onLogout}
            onPasswordChange={() => setIsPasswordModalOpen(true)}
            role={user.role}
          />
        </header>

        {user.role === "admin" && activeNavItem === "Dashboard" && (
          <AdminDashboardPanel currencyName={schoolInfo.currencyName} />
        )}

        {user.role === "admin" && activeNavItem === "Users" && (
          <AdminUsersPanel currentUser={user} />
        )}

        {user.role === "admin" && activeNavItem === "Groups" && (
          <AdminGroupsPanel />
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

        {user.role === "admin" && activeNavItem === "Audit Log" && (
          <AdminAuditLogPanel currentUser={user} />
        )}

        {user.role === "admin" && activeNavItem === "Settings" && (
          <AdminSettingsPanel
            currentUser={user}
            onSchoolInfoUpdated={setSchoolInfo}
          />
        )}

        {isPasswordModalOpen && (
          <ChangePasswordModal
            currentUser={user}
            onClose={() => setIsPasswordModalOpen(false)}
          />
        )}
      </div>
    </main>
  );
}
