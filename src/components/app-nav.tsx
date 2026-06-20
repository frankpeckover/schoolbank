"use client";

import { useState } from "react";
import type { Role } from "@/lib/session";
import { LogOutIcon, MenuIcon } from "@/components/ui/icons";

const defaultNavigationItems = [
  "Dashboard",
  "Shop",
  "Transaction Log",
] as const;
const studentNavigationItems = ["Dashboard", "Shop"] as const;
const adminNavigationItems = [
  "Dashboard",
  "Users",
  "Groups",
  "Shop",
  "Transaction Log",
  "Audit Log",
  "Settings",
] as const;

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
  const [isOpen, setIsOpen] = useState(false);
  const navigationItems = getNavigationItems(role);

  function handleItemChange(item: NavigationItem) {
    onItemChange(item);
    setIsOpen(false);
  }

  function handleLogout() {
    setIsOpen(false);
    onLogout();
  }

  function handlePasswordChange() {
    setIsOpen(false);
    onPasswordChange();
  }

  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        aria-label="Open menu"
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-button-border bg-surface text-text-control transition hover:bg-surface-hover"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        type="button"
      >
        <MenuIcon />
      </button>

      {isOpen && (
        <div className="motion-pop absolute right-0 top-12 z-30 w-64 rounded-md border border-border bg-surface p-2 shadow-lg">
          {navigationItems.map((item) => (
            <button
              aria-current={activeItem === item ? "page" : undefined}
              className={`block w-full rounded-md px-3 py-3 text-left text-sm font-semibold transition ${
                activeItem === item
                  ? "bg-brand text-white"
                  : "text-text-control hover:bg-panel-soft"
              }`}
              key={item}
              onClick={() => handleItemChange(item)}
              type="button"
            >
              {item}
            </button>
          ))}

          <button
            className="mt-2 block w-full border-t border-border-subtle px-3 py-3 text-left text-sm font-semibold text-text-control transition hover:bg-panel-soft"
            onClick={handlePasswordChange}
            type="button"
          >
            Change password
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm font-semibold text-text-control transition hover:bg-panel-soft"
            onClick={handleLogout}
            type="button"
          >
            <LogOutIcon />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}

function getNavigationItems(role: Role) {
  if (role === "admin") {
    return adminNavigationItems;
  }

  if (role === "student") {
    return studentNavigationItems;
  }

  return defaultNavigationItems;
}
