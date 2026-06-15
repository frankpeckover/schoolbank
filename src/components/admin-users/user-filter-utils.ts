import type { UserListItem } from "@/services/user-service";
import type { UserFilters } from "@/components/admin-users/user-management-types";

export function matchesUserFilters(
  user: UserListItem,
  filters: UserFilters,
  showInactiveUsers: boolean,
) {
  if (!showInactiveUsers && !user.isActive) {
    return false;
  }

  return (
    includesFilter(user.firstName, filters.firstName) &&
    includesFilter(user.lastName, filters.lastName) &&
    includesFilter(user.username, filters.username) &&
    includesFilter(user.email, filters.email) &&
    (!filters.role || user.role === filters.role)
  );
}

function includesFilter(value: string, filter: string) {
  return value.toLowerCase().includes(filter.trim().toLowerCase());
}
