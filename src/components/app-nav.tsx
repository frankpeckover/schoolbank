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
  AlertTriangleIcon,
  ClockIcon,
  CogIcon,
  EyeIcon,
  ListIcon,
  LogOutIcon,
  MoonIcon,
  PackageIcon,
  SidebarCollapseIcon,
  SidebarExpandIcon,
  SunIcon,
  TargetIcon,
  UserCircleIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { AppBrand } from "@/components/ui/app-brand";
import { UserAvatar } from "@/components/ui/user-avatar";

const defaultNavigationItems = [
  "Dashboard",
  "Analytics",
  "Shop",
  "Transaction Log",
] as const;
const studentNavigationItems = ["Dashboard", "Shop"] as const;
const adminNavigationItems = [
  "Dashboard",
  "Users",
  "Groups",
  "Timetable",
  "Analytics",
  "Shop",
  "Transaction Log",
  "Audit Log",
  "Error Log",
  "Settings",
] as const;

export type NavigationItem = (typeof adminNavigationItems)[number];

type HeaderNavMenuProps = {
  activeItem: NavigationItem;
  onItemChange: (item: NavigationItem) => void;
  onLogout: () => void;
  onPasswordChange: () => void;
  profileImageUrl: string;
  role: Role;
  userDisplayName: string;
};

export function HeaderNavMenu({
  activeItem,
  onItemChange,
  onLogout,
  onPasswordChange,
  profileImageUrl,
  role,
  userDisplayName,
}: HeaderNavMenuProps) {
  const navRef = useRef<HTMLElement | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const {
    accentTheme,
    accentThemeOptions,
    customAccentColor,
    setCustomAccentColor,
    setAccentTheme,
  } = useAccentTheme();
  const { isDarkMode, toggleThemeMode } = useThemeMode();
  const navigationItems = getNavigationItems(role);

  function closeMenus() {
    setIsMobileMenuOpen(false);
  }

  useEffect(() => {
    if (!isMobileMenuOpen) {
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
  }, [isMobileMenuOpen]);

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
      <button
        aria-expanded={isMobileMenuOpen}
        aria-label="Open menu"
        className="inline-flex h-10 items-center justify-center gap-1 rounded-md border border-border-subtle bg-panel-soft px-2 text-text-control transition hover:border-brand-soft-strong hover:bg-brand-soft hover:text-brand-ink hover:shadow-sm lg:hidden"
        onClick={() =>
          setIsMobileMenuOpen((currentValue) => !currentValue)
        }
        type="button"
      >
        <UserAvatar
          displayName={userDisplayName}
          imageUrl={profileImageUrl}
          size="sm"
        />
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

export function DesktopSideNav({
  activeItem,
  onItemChange,
  role,
}: Pick<HeaderNavMenuProps, "activeItem" | "onItemChange" | "role">) {
  const [isExpanded, setIsExpanded] = useState(true);
  const navigationItems = getNavigationItems(role);

  function handleItemChange(item: NavigationItem) {
    onItemChange(item);
  }

  const widthClassName = isExpanded ? "w-60" : "w-20";

  return (
    <>
      <div
        aria-hidden="true"
        className={`hidden shrink-0 transition-[width] duration-200 lg:block ${widthClassName}`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-[90] hidden h-dvh shrink-0 transition-[width] duration-200 lg:block ${widthClassName}`}
      >
        <div className="flex h-full flex-col gap-4 border-r border-border-subtle bg-surface p-3 shadow-sm">
          <div
            className={`flex h-10 items-center gap-2 px-1 ${
              isExpanded ? "justify-between" : "justify-center"
            }`}
          >
            {isExpanded && (
              <div className="min-w-0">
                <AppBrand showNameOnMobile />
              </div>
            )}
            <button
              aria-label={isExpanded ? "Collapse navigation" : "Expand navigation"}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center text-text-muted transition hover:bg-brand-soft hover:text-brand-ink"
              onClick={() => setIsExpanded((currentValue) => !currentValue)}
              title={isExpanded ? "Collapse navigation" : "Expand navigation"}
              type="button"
            >
              {isExpanded ? (
                <SidebarCollapseIcon className="h-4 w-4" />
              ) : (
                <SidebarExpandIcon className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {navigationItems.map((item) => (
              <SideNavButton
                isActive={activeItem === item}
                isExpanded={isExpanded}
                item={item}
                key={item}
                onItemChange={handleItemChange}
              />
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}

export function DesktopAccountMenu({
  onLogout,
  onPasswordChange,
  profileImageUrl,
  userDisplayName,
}: Pick<
  HeaderNavMenuProps,
  "onLogout" | "onPasswordChange" | "profileImageUrl" | "userDisplayName"
>) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const {
    accentTheme,
    accentThemeOptions,
    customAccentColor,
    setCustomAccentColor,
    setAccentTheme,
  } = useAccentTheme();
  const { isDarkMode, toggleThemeMode } = useThemeMode();

  function closeMenu() {
    setIsAccountMenuOpen(false);
  }

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  function handleLogout() {
    closeMenu();
    onLogout();
  }

  function handlePasswordChange() {
    closeMenu();
    onPasswordChange();
  }

  return (
    <div className="relative hidden lg:block" ref={menuRef}>
      <button
        aria-expanded={isAccountMenuOpen}
        aria-label="Open account menu"
        className={`flex h-10 items-center gap-2 rounded-md px-2 text-xs font-light transition ${
          isAccountMenuOpen
            ? "bg-brand text-white shadow-sm"
            : "text-text-control hover:bg-brand-soft hover:text-brand-ink"
        }`}
        onClick={() => setIsAccountMenuOpen((currentValue) => !currentValue)}
        type="button"
      >
        <UserAvatar
          displayName={userDisplayName}
          imageUrl={profileImageUrl}
          size="sm"
        />
      </button>

      {isAccountMenuOpen && (
        <NavMenuPanel align="right">
          <AccountMenuItems
            accentTheme={accentTheme}
            accentThemeOptions={accentThemeOptions}
            customAccentColor={customAccentColor}
            hasTopBorder={false}
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
  );
}

function SideNavButton({
  isActive,
  isExpanded,
  item,
  onItemChange,
}: {
  isActive: boolean;
  isExpanded: boolean;
  item: NavigationItem;
  onItemChange: (item: NavigationItem) => void;
}) {
  return (
    <button
      aria-current={isActive ? "page" : undefined}
      aria-label={item}
      className={`flex h-11 w-full items-center text-xs font-light transition ${
        isActive
          ? "bg-brand text-white shadow-sm"
          : "text-text-control hover:bg-brand-soft hover:text-brand-ink"
      } ${isExpanded ? "justify-start gap-3 px-3" : "justify-center px-0"}`}
      onClick={() => onItemChange(item)}
      title={item}
      type="button"
    >
      <NavigationItemIcon item={item} />
      {isExpanded && <span className="truncate">{item}</span>}
    </button>
  );
}

function NavMenuPanel({
  align = "right",
  children,
  placement = "down",
}: {
  align?: "left" | "right";
  children: ReactNode;
  placement?: "down" | "up";
}) {
  return (
    <div
      className={`motion-pop absolute z-[110] w-64 rounded-md border border-border bg-surface p-2 shadow-lg ${
        align === "left" ? "left-0" : "right-0"
      } ${placement === "up" ? "bottom-12" : "top-12"}`}
    >
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
      className={`block w-full rounded-md px-3 py-3 text-left text-xs font-light transition ${
        isActive
          ? "bg-brand text-white shadow-sm"
          : "text-text-control hover:bg-brand-soft hover:text-brand-ink"
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
        className={`flex w-full items-center gap-2 rounded-md px-3 py-3 text-left text-xs font-light text-text-control transition hover:bg-brand-soft hover:text-brand-ink ${
          hasTopBorder ? "mt-2 border-t border-border-subtle" : ""
        }`}
        onClick={onThemeToggle}
        type="button"
      >
        {isDarkMode ? <SunIcon /> : <MoonIcon />}
        <span>{isDarkMode ? "Light theme" : "Dark theme"}</span>
      </button>
      <div className="px-3 py-3">
        <p className="text-xs font-light uppercase tracking-[0.14em] text-text-kicker">
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
          <div className="mb-2">
            <span className="text-xs font-light text-text-muted">
              Custom colour
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              aria-label="Custom accent colour"
              className="color-swatch-input h-10 w-10 shrink-0 cursor-pointer rounded-full border border-border bg-transparent p-0.5"
              onChange={(event) =>
                onCustomAccentColorChange(event.target.value)
              }
              type="color"
              value={colorInputValue}
            />
            <input
              aria-label="Custom accent hex"
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-xs font-light uppercase text-text-control outline-none ring-brand transition placeholder:text-text-muted focus:border-brand focus:ring-2"
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
        className="block w-full rounded-md px-3 py-3 text-left text-xs font-light text-text-control transition hover:bg-brand-soft hover:text-brand-ink"
        onClick={onPasswordChange}
        type="button"
      >
        Change password
      </button>
      <button
        className="flex w-full items-center gap-2 rounded-md px-3 py-3 text-left text-xs font-light text-text-control transition hover:bg-brand-soft hover:text-brand-ink"
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

function NavigationItemIcon({ item }: { item: NavigationItem }) {
  const className = "h-4 w-4 shrink-0";

  switch (item) {
    case "Dashboard":
      return <WalletIcon className={className} />;
    case "Analytics":
      return <TargetIcon className={className} />;
    case "Shop":
      return <PackageIcon className={className} />;
    case "Transaction Log":
      return <ListIcon className={className} />;
    case "Users":
      return <UsersIcon className={className} />;
    case "Groups":
      return <UserCircleIcon className={className} />;
    case "Timetable":
      return <ClockIcon className={className} />;
    case "Audit Log":
      return <EyeIcon className={className} />;
    case "Error Log":
      return <AlertTriangleIcon className={className} />;
    case "Settings":
      return <CogIcon className={className} />;
    default:
      return <ListIcon className={className} />;
  }
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
