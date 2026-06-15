"use client";

import { useEffect, useState } from "react";
import { listUsers } from "@/lib/actions";
import { UserFiltersPanel } from "@/components/admin-users/user-filters";
import { matchesUserFilters } from "@/components/admin-users/user-filter-utils";
import {
  emptyFilters,
  type UserFilters,
} from "@/components/admin-users/user-management-types";
import { UserImportModal } from "@/components/admin-users/user-import-modal";
import { UserModal } from "@/components/admin-users/user-modal";
import { UsersTable } from "@/components/admin-users/users-table";
import type { UserListItem } from "@/services/user-service";

export function AdminUsersPanel() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filters, setFilters] = useState<UserFilters>(emptyFilters);
  const [showInactiveUsers, setShowInactiveUsers] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

  function handleUserSaved(messageText: string) {
    setEditingUser(null);
    setIsCreateModalOpen(false);
    setMessage(messageText);
    refreshUsers();
  }

  function handleUsersImported(messageText: string, shouldClose = true) {
    setMessage(messageText);

    if (shouldClose) {
      setIsImportModalOpen(false);
    }
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
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="rounded-md border border-button-border px-4 py-3 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
            onClick={() => setIsImportModalOpen(true)}
            type="button"
          >
            Import CSV
          </button>
          <button
            className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover"
            onClick={() => setIsCreateModalOpen(true)}
            type="button"
          >
            New User
          </button>
        </div>
      </div>

      <UserFiltersPanel
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
        {!isLoading && !error && filteredUsers.length > 0 && (
          <UsersTable
            onEdit={setEditingUser}
            users={filteredUsers}
          />
        )}
        {!isLoading && !error && filteredUsers.length === 0 && (
          <p className="mt-4 text-sm text-text-muted">No users match these filters.</p>
        )}
      </div>

      {isCreateModalOpen && (
        <UserModal
          mode="create"
          onClose={() => setIsCreateModalOpen(false)}
          onSaved={() => handleUserSaved("User created.")}
        />
      )}

      {isImportModalOpen && (
        <UserImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImportCompleted={refreshUsers}
          onImported={handleUsersImported}
        />
      )}

      {editingUser && (
        <UserModal
          mode="edit"
          onClose={() => setEditingUser(null)}
          onSaved={() => handleUserSaved("User updated.")}
          user={editingUser}
        />
      )}
    </section>
  );
}
