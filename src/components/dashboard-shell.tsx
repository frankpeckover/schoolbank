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
  DesktopAccountMenu,
  DesktopSideNav,
  HeaderNavMenu,
  type NavigationItem,
} from "@/components/app-nav";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { ShopPanel } from "@/components/shop/shop-panel";
import { StudentDashboardPanel } from "@/components/student-dashboard-panel";
import { TeacherDashboardPanel } from "@/components/teacher-dashboard-panel";
import { TransactionLogPanel } from "@/components/transactions/transaction-log-panel";
import { AppBrand } from "@/components/ui/app-brand";
import { AppFooter } from "@/components/ui/app-footer";
import { GlobalMaintenanceBanner } from "@/components/ui/global-maintenance-banner";
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
  maintenanceMessage: string;
  user: SessionUser;
  onLogout: () => void;
};

export function DashboardShell({
  maintenanceMessage,
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
      <GlobalMaintenanceBanner message={maintenanceMessage} />
      <div className="flex min-h-screen w-full min-w-0 overflow-x-hidden">
        <DesktopSideNav
          activeItem={activeNavItem}
          onItemChange={setActiveNavItem}
          role={user.role}
        />

        <div className="mx-auto flex min-w-0 flex-1 flex-col px-4 py-2 sm:px-6 lg:max-w-[calc(96rem-15rem)] lg:px-8">
          <header className="relative z-50 pb-2 pt-4">
            <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-3">
              <div className="lg:hidden">
                <AppBrand />
              </div>
              <p className="min-w-0 flex-1 truncate text-left text-base font-medium text-text-control sm:text-center sm:text-lg lg:text-left">
                {greeting}, {getGreetingName(user)}!
              </p>
              <DesktopAccountMenu
                onLogout={onLogout}
                onPasswordChange={() => setIsPasswordModalOpen(true)}
                profileImageUrl={user.profileImageUrl}
                userDisplayName={user.displayName}
              />
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

        <AppFooter
          contactEmail={schoolInfo.contactEmail}
          schoolName={schoolName}
        />
        </div>
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
