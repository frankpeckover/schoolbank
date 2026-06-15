import type { Role } from "@/lib/session";

const defaultNavigationItems = [
  "Dashboard",
  "Shop",
  "Transaction Log",
] as const;
const studentNavigationItems = ["Dashboard", "Shop"] as const;
const adminNavigationItems = [
  "Dashboard",
  "Users",
  "Shop",
  "Transaction Log",
  "Settings",
] as const;

export type NavigationItem = (typeof adminNavigationItems)[number];

type AppNavProps = {
  activeItem: NavigationItem;
  onItemChange: (item: NavigationItem) => void;
  role: Role;
};

export function AppNav({ activeItem, onItemChange, role }: AppNavProps) {
  const navigationItems =
    role === "admin"
      ? adminNavigationItems
      : role === "student"
        ? studentNavigationItems
        : defaultNavigationItems;

  return (
    <nav
      aria-label="Primary"
      className="mt-4 overflow-x-auto border-b border-border pb-3"
    >
      <div className="flex min-w-max gap-2">
        {navigationItems.map((item) => (
          <button
            aria-current={activeItem === item ? "page" : undefined}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
              activeItem === item
                ? "bg-brand text-white"
                : "border border-border-subtle bg-surface text-text-control hover:border-brand"
            }`}
            key={item}
            onClick={() => onItemChange(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
    </nav>
  );
}
