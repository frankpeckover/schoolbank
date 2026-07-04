"use client";

import { useEffect, useState } from "react";
import { AdminAuditLogPanel } from "@/components/admin-audit-log-panel";
import { AdminDashboardPanel } from "@/components/admin-dashboard-panel";
import { AdminErrorLogPanel } from "@/components/admin-error-log-panel";
import { AdminGroupsPanel } from "@/components/admin-groups-panel";
import { AdminSettingsPanel } from "@/components/admin-settings-panel";
import { AdminTimetablePanel } from "@/components/admin-timetable-panel";
import { AdminUsersPanel } from "@/components/admin-users-panel";
import { CreditAnalyticsPanel } from "@/components/credit-analytics-panel";
import {
  HeaderNavMenu,
  type NavigationItem,
} from "@/components/app-nav";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { ShopPanel } from "@/components/shop/shop-panel";
import { StudentDashboardPanel } from "@/components/student-dashboard-panel";
import { TeacherDashboardPanel } from "@/components/teacher-dashboard-panel";
import { TransactionLogPanel } from "@/components/transactions/transaction-log-panel";
import { AppBrand } from "@/components/ui/app-brand";
import { getSchoolInfo } from "@/lib/actions";
import { appConfig } from "@/lib/app-config";
import {
  canManageGroups,
  canManageSchoolSettings,
  canManageUsers,
  canViewAuditLog,
  isAdmin,
  isStudent,
  isTeacher,
} from "@/lib/permissions";
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
  const [greeting, setGreeting] = useState("Hello");
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

  useEffect(() => {
    window.queueMicrotask(() => {
      setGreeting(getTimeOfDayGreeting(new Date()));
    });
  }, []);

  const schoolName = schoolInfo.name.trim() || appConfig.defaultSchoolName;
  const shellRoleClassName = getShellRoleClassName(user);

  return (
    <main className={`app-shell-surface min-h-screen overflow-x-hidden bg-background text-foreground ${shellRoleClassName}`}>
      <div className="mx-auto flex min-h-screen w-full max-w-7xl min-w-0 flex-col overflow-x-hidden px-4 py-4 sm:px-6 lg:px-8">
        <header className="relative z-50 py-3">
          <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-3">
            <AppBrand />
            <p className="min-w-0 flex-1 truncate text-left text-sm font-medium text-text-control sm:text-center sm:text-base">
              {greeting}, {getGreetingName(user)}!
            </p>
            <HeaderNavMenu
              activeItem={activeNavItem}
              onItemChange={setActiveNavItem}
              onLogout={onLogout}
              onPasswordChange={() => setIsPasswordModalOpen(true)}
              profileImageUrl={user.profileImageUrl}
              role={user.role}
              userDisplayName={user.displayName}
            />
          </div>
        </header>

        {isAdmin(user) && activeNavItem === "Dashboard" && (
          <AdminDashboardPanel
            currencyName={schoolInfo.currencyName}
            schoolName={schoolName}
          />
        )}

        {canManageUsers(user) && activeNavItem === "Users" && (
          <AdminUsersPanel schoolName={schoolName} />
        )}

        {canManageGroups(user) && activeNavItem === "Groups" && (
          <AdminGroupsPanel />
        )}

        {canManageGroups(user) && activeNavItem === "Timetable" && (
          <AdminTimetablePanel />
        )}

        {isTeacher(user) && activeNavItem === "Dashboard" && (
          <TeacherDashboardPanel
            currencyName={schoolInfo.currencyName}
            schoolName={schoolName}
          />
        )}

        {!isStudent(user) && activeNavItem === "Analytics" && (
          <CreditAnalyticsPanel
            currencyName={schoolInfo.currencyName}
          />
        )}

        {isStudent(user) && activeNavItem === "Dashboard" && (
          <StudentDashboardPanel
            currencyName={schoolInfo.currencyName}
            currentUser={user}
            schoolName={schoolName}
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

        {canViewAuditLog(user) && activeNavItem === "Audit Log" && (
          <AdminAuditLogPanel />
        )}

        {canViewAuditLog(user) && activeNavItem === "Error Log" && (
          <AdminErrorLogPanel />
        )}

        {canManageSchoolSettings(user) && activeNavItem === "Settings" && (
          <AdminSettingsPanel
            onSchoolInfoUpdated={setSchoolInfo}
          />
        )}

        {isPasswordModalOpen && (
          <ChangePasswordModal
            onClose={() => setIsPasswordModalOpen(false)}
          />
        )}
      </div>
    </main>
  );
}

function getGreetingName(user: SessionUser) {
  return user.firstName.trim() || user.displayName.trim() || user.username;
}

function getShellRoleClassName(user: SessionUser) {
  if (isAdmin(user)) {
    return "professional-shell admin-shell";
  }

  if (isTeacher(user)) {
    return "professional-shell teacher-shell";
  }

  return "student-shell";
}

function getTimeOfDayGreeting(date: Date) {
  const hour = date.getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}
