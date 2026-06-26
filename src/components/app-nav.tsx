"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  defaultCustomAccentColor,
  type AccentTheme,
  type AccentThemeOption,
} from "@/lib/accent-theme-config";
import type { Role } from "@/lib/session";
import { isAdmin, isStudent } from "@/lib/permissions";
import { useAccentTheme } from "@/lib/use-accent-theme";
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
  const {
    accentTheme,
    accentThemeOptions,
    customAccentColor,
    setCustomAccentColor,
    setAccentTheme,
  } = useAccentTheme();
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
                accentTheme={accentTheme}
                accentThemeOptions={accentThemeOptions}
                customAccentColor={customAccentColor}
                hasTopBorder={overflowNavigationItems.length > 0}
                isDarkMode={isDarkMode}
                onAccentThemeChange={setAccentTheme}
                onCustomAccentColorChange={setCustomAccentColor}
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
            accentTheme={accentTheme}
            accentThemeOptions={accentThemeOptions}
            customAccentColor={customAccentColor}
            hasTopBorder
            isDarkMode={isDarkMode}
            onAccentThemeChange={setAccentTheme}
            onCustomAccentColorChange={setCustomAccentColor}
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
  accentTheme,
  accentThemeOptions,
  customAccentColor,
  hasTopBorder,
  isDarkMode,
  onAccentThemeChange,
  onCustomAccentColorChange,
  onLogout,
  onPasswordChange,
  onThemeToggle,
}: {
  accentTheme: AccentTheme;
  accentThemeOptions: AccentThemeOption[];
  customAccentColor: string;
  hasTopBorder: boolean;
  isDarkMode: boolean;
  onAccentThemeChange: (accentTheme: AccentTheme) => void;
  onCustomAccentColorChange: (customAccentColor: string) => void;
  onLogout: () => void;
  onPasswordChange: () => void;
  onThemeToggle: () => void;
}) {
  const colorInputValue = getColorInputValue(customAccentColor);

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
      <div className="px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-kicker">
          Accent
        </p>
        <div className="mt-3 flex items-center gap-2">
          {accentThemeOptions.map((option) => (
            <button
              aria-label={`${option.label} accent`}
              aria-pressed={accentTheme === option.value}
              className={`h-7 w-7 rounded-full border transition ${
                accentTheme === option.value
                  ? "border-foreground ring-2 ring-brand-soft-strong"
                  : "border-border-subtle hover:scale-105"
              }`}
              key={option.value}
              onClick={() => onAccentThemeChange(option.value)}
              style={{
                backgroundColor:
                  option.value === "custom"
                    ? customAccentColor
                    : option.swatch,
              }}
              title={option.label}
              type="button"
            />
          ))}
        </div>
        <div className="mt-3 rounded-md border border-border-subtle bg-panel-soft p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-text-muted">
              Custom colour
            </span>
            <span
              className="h-4 w-4 rounded-full border border-border-subtle"
              style={{ backgroundColor: colorInputValue }}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              aria-label="Custom accent colour"
              className="h-10 w-11 shrink-0 cursor-pointer rounded-md border border-border bg-surface p-1"
              onChange={(event) =>
                onCustomAccentColorChange(event.target.value)
              }
              type="color"
              value={colorInputValue}
            />
            <input
              aria-label="Custom accent hex"
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold uppercase text-text-control outline-none ring-brand transition placeholder:text-text-muted focus:border-brand focus:ring-2"
              maxLength={7}
              onChange={(event) =>
                onCustomAccentColorChange(event.target.value)
              }
              placeholder="#2563EB"
              value={customAccentColor}
            />
          </div>
        </div>
      </div>
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

function getColorInputValue(color: string) {
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return color;
  }

  return defaultCustomAccentColor;
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
