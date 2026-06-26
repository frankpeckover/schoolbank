"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Role } from "@/lib/session";
import { isAdmin, isStudent } from "@/lib/permissions";
import { useThemeMode } from "@/lib/use-theme-mode";
import {
  ChevronDownIcon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
  UserCircleIcon,
} from "@/components/ui/icons";

const defaultNavigationItems = [
  "Dashboard",
  "Balances",
  "Shop",
  "Transaction Log",
] as const;
const studentNavigationItems = ["Dashboard", "Shop"] as const;
const adminNavigationItems = [
  "Dashboard",
  "Users",
  "Groups",
  "Balances",
  "Shop",
  "Transaction Log",
  "Audit Log",
  "Error Log",
  "Settings",
] as const;
const adminPrimaryNavigationItems = [
  "Dashboard",
  "Users",
  "Groups",
  "Balances",
  "Shop",
] as const;
const adminOverflowNavigationItems = [
  "Transaction Log",
  "Audit Log",
  "Error Log",
  "Settings",
] as const;
const defaultPrimaryNavigationItems = [
  "Dashboard",
  "Balances",
  "Shop",
] as const;
const defaultOverflowNavigationItems = ["Transaction Log"] as const;

export type NavigationItem = (typeof adminNavigationItems)[number];

type HeaderNavMenuProps = {
  activeItem: NavigationItem;
  onItemChange: (item: NavigationItem) => void;
  onLogout: () => void;
  onPasswordChange: () => void;
  role: Role;
};

export function HeaderNavMenu({
  activeItem,
  onItemChange,
  onLogout,
  onPasswordChange,
  role,
}: HeaderNavMenuProps) {
  const navRef = useRef<HTMLElement | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
  const { isDarkMode, toggleThemeMode } = useThemeMode();
  const navigationItems = getNavigationItems(role);
  const primaryNavigationItems = getPrimaryNavigationItems(role);
  const overflowNavigationItems = getOverflowNavigationItems(role);
  const isOverflowActive = overflowNavigationItems.includes(activeItem);
  const isAnyMenuOpen = isMobileMenuOpen || isOverflowMenuOpen;

  function closeMenus() {
    setIsMobileMenuOpen(false);
    setIsOverflowMenuOpen(false);
  }

  useEffect(() => {
    if (!isAnyMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!navRef.current?.contains(event.target as Node)) {
        closeMenus();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAnyMenuOpen]);

  function handleItemChange(item: NavigationItem) {
    onItemChange(item);
    closeMenus();
  }

  function handleLogout() {
    closeMenus();
    onLogout();
  }

  function handlePasswordChange() {
    closeMenus();
    onPasswordChange();
  }

  return (
    <nav className="relative z-[100] flex items-center gap-2" ref={navRef}>
      <div className="hidden items-center gap-1 lg:flex">
        {primaryNavigationItems.map((item) => (
          <DesktopNavButton
            isActive={activeItem === item}
            item={item}
            key={item}
            onItemChange={handleItemChange}
          />
        ))}

        <div className="relative">
          <button
            aria-expanded={isOverflowMenuOpen}
            aria-label="Open menu"
            className={`inline-flex h-10 items-center justify-center gap-1 rounded-md px-2 text-sm font-semibold transition ${
              isOverflowActive
                ? "bg-brand text-white"
                : "text-text-control hover:bg-panel-soft"
            }`}
            onClick={() =>
              setIsOverflowMenuOpen((currentValue) => !currentValue)
            }
            type="button"
          >
            <UserCircleIcon className="h-5 w-5" />
            <ChevronDownIcon className="h-3.5 w-3.5" />
          </button>

          {isOverflowMenuOpen && (
            <NavMenuPanel>
              {overflowNavigationItems.map((item) => (
                <MenuItemButton
                  isActive={activeItem === item}
                  item={item}
                  key={item}
                  onItemChange={handleItemChange}
                />
              ))}
              <AccountMenuItems
                hasTopBorder={overflowNavigationItems.length > 0}
                isDarkMode={isDarkMode}
                onLogout={handleLogout}
                onPasswordChange={handlePasswordChange}
                onThemeToggle={toggleThemeMode}
              />
            </NavMenuPanel>
          )}
        </div>
      </div>

      <button
        aria-expanded={isMobileMenuOpen}
        aria-label="Open menu"
        className="inline-flex h-10 items-center justify-center gap-1 rounded-md border border-border-subtle bg-panel-soft px-2 text-text-control transition hover:bg-surface-hover lg:hidden"
        onClick={() =>
          setIsMobileMenuOpen((currentValue) => !currentValue)
        }
        type="button"
      >
        <UserCircleIcon className="h-5 w-5" />
        <ChevronDownIcon className="h-3.5 w-3.5" />
      </button>

      {isMobileMenuOpen && (
        <NavMenuPanel>
          {navigationItems.map((item) => (
            <MenuItemButton
              isActive={activeItem === item}
              item={item}
              key={item}
              onItemChange={handleItemChange}
            />
          ))}

          <AccountMenuItems
            hasTopBorder
            isDarkMode={isDarkMode}
            onLogout={handleLogout}
            onPasswordChange={handlePasswordChange}
            onThemeToggle={toggleThemeMode}
          />
        </NavMenuPanel>
      )}
    </nav>
  );
}

function DesktopNavButton({
  isActive,
  item,
  onItemChange,
}: {
  isActive: boolean;
  item: NavigationItem;
  onItemChange: (item: NavigationItem) => void;
}) {
  return (
    <button
      aria-current={isActive ? "page" : undefined}
      className={`inline-flex h-10 items-center justify-center rounded-md px-3 text-sm font-semibold transition ${
        isActive
          ? "bg-brand text-white"
          : "text-text-control hover:bg-panel-soft"
      }`}
      onClick={() => onItemChange(item)}
      type="button"
    >
      {item}
    </button>
  );
}

function NavMenuPanel({ children }: { children: ReactNode }) {
  return (
    <div className="motion-pop absolute right-0 top-12 z-[110] w-64 rounded-md border border-border bg-surface p-2 shadow-lg">
      {children}
    </div>
  );
}

function MenuItemButton({
  isActive,
  item,
  onItemChange,
}: {
  isActive: boolean;
  item: NavigationItem;
  onItemChange: (item: NavigationItem) => void;
}) {
  return (
    <button
      aria-current={isActive ? "page" : undefined}
      className={`block w-full rounded-md px-3 py-3 text-left text-sm font-semibold transition ${
        isActive
          ? "bg-brand text-white"
          : "text-text-control hover:bg-panel-soft"
      }`}
      onClick={() => onItemChange(item)}
      type="button"
    >
      {item}
    </button>
  );
}

function AccountMenuItems({
  hasTopBorder,
  isDarkMode,
  onLogout,
  onPasswordChange,
  onThemeToggle,
}: {
  hasTopBorder: boolean;
  isDarkMode: boolean;
  onLogout: () => void;
  onPasswordChange: () => void;
  onThemeToggle: () => void;
}) {
  return (
    <>
      <button
        className={`flex w-full items-center gap-2 px-3 py-3 text-left text-sm font-semibold text-text-control transition hover:bg-panel-soft ${
          hasTopBorder ? "mt-2 border-t border-border-subtle" : ""
        }`}
        onClick={onThemeToggle}
        type="button"
      >
        {isDarkMode ? <SunIcon /> : <MoonIcon />}
        <span>{isDarkMode ? "Light theme" : "Dark theme"}</span>
      </button>
      <button
        className="block w-full px-3 py-3 text-left text-sm font-semibold text-text-control transition hover:bg-panel-soft"
        onClick={onPasswordChange}
        type="button"
      >
        Change password
      </button>
      <button
        className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm font-semibold text-text-control transition hover:bg-panel-soft"
        onClick={onLogout}
        type="button"
      >
        <LogOutIcon />
        <span>Sign out</span>
      </button>
    </>
  );
}

function getNavigationItems(role: Role) {
  const userRole = { role };

  if (isAdmin(userRole)) {
    return adminNavigationItems;
  }

  if (isStudent(userRole)) {
    return studentNavigationItems;
  }

  return defaultNavigationItems;
}

function getPrimaryNavigationItems(role: Role): readonly NavigationItem[] {
  const userRole = { role };

  if (isAdmin(userRole)) {
    return adminPrimaryNavigationItems;
  }

  if (isStudent(userRole)) {
    return studentNavigationItems;
  }

  return defaultPrimaryNavigationItems;
}

function getOverflowNavigationItems(role: Role): readonly NavigationItem[] {
  const userRole = { role };

  if (isAdmin(userRole)) {
    return adminOverflowNavigationItems;
  }

  if (isStudent(userRole)) {
    return [];
  }

  return defaultOverflowNavigationItems;
}
