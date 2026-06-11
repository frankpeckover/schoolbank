"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  createUser,
  listUsers,
  setUserActive,
} from "@/lib/actions";
import type { CreateUserInput, UserListItem } from "@/services/user-service";
import type { Role } from "@/lib/session";

const userRoles: Role[] = ["admin", "teacher", "student"];

type UserFilters = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: "" | Role;
};

const emptyFilters: UserFilters = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  role: "",
};

export function AdminUsersPanel() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filters, setFilters] = useState<UserFilters>(emptyFilters);
  const [showInactiveUsers, setShowInactiveUsers] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function refreshUsers() {
    setIsLoading(true);

    try {
      const loadedUsers = await listUsers();

      setUsers(loadedUsers);
      setError(null);
    } catch {
      setError("Could not load users.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      try {
        const loadedUsers = await listUsers();

        if (isMounted) {
          setUsers(loadedUsers);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load users.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleStatusChange(user: UserListItem) {
    setError(null);
    setMessage(null);

    const result = await setUserActive(user.id, !user.isActive);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(user.isActive ? "User disabled." : "User enabled.");
    refreshUsers();
  }

  const filteredUsers = users.filter((user) =>
    matchesUserFilters(user, filters, showInactiveUsers),
  );

  return (
    <section className="mt-5 rounded-md border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Users</h2>
          <p className="mt-1 text-sm text-text-muted">
            Manage who can access SchoolBank.
          </p>
        </div>
        <button
          className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover"
          onClick={() => setIsModalOpen(true)}
          type="button"
        >
          New User
        </button>
      </div>

      <UserFilters
        filters={filters}
        onFiltersChange={setFilters}
        onShowInactiveUsersChange={setShowInactiveUsers}
        showInactiveUsers={showInactiveUsers}
      />

      <div className="mt-5 overflow-x-auto">
        {isLoading && <p className="text-sm text-text-muted">Loading users...</p>}
        {error && (
          <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
            {error}
          </p>
        )}
        {message && (
          <p className="mb-4 rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-semibold text-success">
            {message}
          </p>
        )}
        {!isLoading && !error && (
          <table className="w-full min-w-[780px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-text-muted">
                <th className="py-3 pr-4 font-semibold">First Name</th>
                <th className="py-3 pr-4 font-semibold">Last Name</th>
                <th className="py-3 pr-4 font-semibold">Username</th>
                <th className="py-3 pr-4 font-semibold">Email</th>
                <th className="py-3 pr-4 font-semibold">Role</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
                <th className="py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr className="border-b border-border-subtle" key={user.id}>
                  <td className="py-3 pr-4 font-semibold">{user.firstName}</td>
                  <td className="py-3 pr-4 font-semibold">{user.lastName}</td>
                  <td className="py-3 pr-4 text-text-muted">{user.username}</td>
                  <td className="py-3 pr-4 text-text-muted">{user.email}</td>
                  <td className="py-3 pr-4 capitalize text-text-muted">
                    {user.role}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded-sm px-2 py-1 text-xs font-semibold ${
                        user.isActive
                          ? "bg-chip-bg text-chip-text"
                          : "bg-danger-soft text-danger-strong"
                      }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        className="rounded-md border border-button-border px-3 py-2 text-sm font-semibold text-text-control transition hover:bg-surface"
                        onClick={() => handleStatusChange(user)}
                        type="button"
                      >
                        {user.isActive ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!isLoading && !error && filteredUsers.length === 0 && (
          <p className="mt-4 text-sm text-text-muted">No users match these filters.</p>
        )}
      </div>

      {isModalOpen && (
        <NewUserModal
          onClose={() => setIsModalOpen(false)}
          onCreated={() => {
            setIsModalOpen(false);
            refreshUsers();
          }}
        />
      )}
    </section>
  );
}

function UserFilters({
  filters,
  onFiltersChange,
  onShowInactiveUsersChange,
  showInactiveUsers,
}: {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  onShowInactiveUsersChange: (showInactiveUsers: boolean) => void;
  showInactiveUsers: boolean;
}) {
  function updateFilter<Field extends keyof UserFilters>(
    field: Field,
    value: UserFilters[Field],
  ) {
    onFiltersChange({ ...filters, [field]: value });
  }

  return (
    <div className="mt-5 rounded-md border border-border-subtle bg-panel-soft p-4">
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
      <input
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </div>
  );
}

function matchesUserFilters(
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

type NewUserModalProps = {
  onClose: () => void;
  onCreated: () => void;
};

function NewUserModal({ onClose, onCreated }: NewUserModalProps) {
  const [form, setForm] = useState<CreateUserInput>({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    role: "student",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const result = await createUser(form);

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    setError(null);
    setIsSaving(false);
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-lg rounded-md border border-border bg-surface p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold">New User</h3>
            <p className="mt-1 text-sm text-text-muted">
              Create a user for this school.
            </p>
          </div>
          <button
            className="rounded-md border border-button-border px-3 py-2 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-text-control" htmlFor="firstName">
                First Name
              </label>
              <input
                className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
                id="firstName"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    firstName: event.target.value,
                  }))
                }
                value={form.firstName}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-text-control" htmlFor="lastName">
                Last Name
              </label>
              <input
                className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
                id="lastName"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    lastName: event.target.value,
                  }))
                }
                value={form.lastName}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-text-control" htmlFor="username">
                Username
              </label>
              <input
                className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
                id="username"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    username: event.target.value,
                  }))
                }
                value={form.username}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-text-control" htmlFor="role">
                Role
              </label>
              <select
                className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
                id="role"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    role: event.target.value as Role,
                  }))
                }
                value={form.role}
              >
                {userRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-text-control" htmlFor="email">
              Email
            </label>
            <input
              className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
              id="email"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              type="email"
              value={form.email}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-text-control" htmlFor="password">
              Password
            </label>
            <input
              className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
              id="password"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              type="password"
              value={form.password}
            />
          </div>

          {error && (
            <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              className="rounded-md border border-button-border px-4 py-3 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
