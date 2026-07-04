import type { Role } from "@/lib/session";
import {
  userRoles,
  type UserFilters,
} from "@/components/admin-users/user-management-types";
import { SearchInput } from "@/components/ui/search-input";

type UserFiltersPanelProps = {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  onShowInactiveUsersChange: (showInactiveUsers: boolean) => void;
  showInactiveUsers: boolean;
};

export function UserFiltersPanel({
  filters,
  onFiltersChange,
  onShowInactiveUsersChange,
  showInactiveUsers,
}: UserFiltersPanelProps) {
  function updateFilter<Field extends keyof UserFilters>(
    field: Field,
    value: UserFilters[Field],
  ) {
    onFiltersChange({ ...filters, [field]: value });
  }

  return (
    <div className="theme-subpanel mt-5 p-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <FilterInput
          id="filterFirstName"
          label="First name"
          onChange={(value) => updateFilter("firstName", value)}
          value={filters.firstName}
        />
        <FilterInput
          id="filterLastName"
          label="Last name"
          onChange={(value) => updateFilter("lastName", value)}
          value={filters.lastName}
        />
        <FilterInput
          id="filterUsername"
          label="Username"
          onChange={(value) => updateFilter("username", value)}
          value={filters.username}
        />
        <FilterInput
          id="filterEmail"
          label="Email"
          onChange={(value) => updateFilter("email", value)}
          value={filters.email}
        />
        <div>
          <label className="text-sm font-semibold text-text-control" htmlFor="filterRole">
            Role
          </label>
          <select
            className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
            id="filterRole"
            onChange={(event) => updateFilter("role", event.target.value as Role | "")}
            value={filters.role}
          >
            <option value="">Any role</option>
            {userRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-text-control">
        <input
          checked={showInactiveUsers}
          className="h-4 w-4"
          onChange={(event) => onShowInactiveUsersChange(event.target.checked)}
          type="checkbox"
        />
        Show inactive users
      </label>
    </div>
  );
}

function FilterInput({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-text-control" htmlFor={id}>
        {label}
      </label>
      <SearchInput
        className="mt-2"
        id={id}
        onChange={onChange}
        value={value}
      />
    </div>
  );
}
