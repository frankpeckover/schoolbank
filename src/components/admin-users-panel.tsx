"use client";

import { useEffect, useState } from "react";
import { listUsers } from "@/lib/actions";
import { appConfig } from "@/lib/app-config";
import { UserFiltersPanel } from "@/components/admin-users/user-filters";
import { matchesUserFilters } from "@/components/admin-users/user-filter-utils";
import {
  emptyFilters,
  type UserFilters,
} from "@/components/admin-users/user-management-types";
import { UserImportModal } from "@/components/admin-users/user-import-modal";
import { UserModal } from "@/components/admin-users/user-modal";
import { UsersTable } from "@/components/admin-users/users-table";
import { IconButton } from "@/components/ui/icon-button";
import { FileUpIcon, FilterIcon, PlusIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import type { SessionUser } from "@/lib/session";
import type { UserListItem } from "@/services/user-service";

export function AdminUsersPanel({ currentUser }: { currentUser: SessionUser }) {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filters, setFilters] = useState<UserFilters>(emptyFilters);
  const [showInactiveUsers, setShowInactiveUsers] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
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
    <section className="motion-panel mt-5 rounded-md border border-border bg-surface p-5 shadow-sm">
      <PageHeader
        actions={
          <>
          <IconButton
            ariaExpanded={areFiltersOpen}
            label={areFiltersOpen ? "Hide filters" : "Show filters"}
            onClick={() => setAreFiltersOpen((isOpen) => !isOpen)}
          >
            <FilterIcon />
          </IconButton>
          <button
            aria-label="Import users from CSV"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-button-border text-text-control transition hover:bg-panel-soft sm:w-auto sm:px-4 sm:text-sm sm:font-semibold"
            onClick={() => setIsImportModalOpen(true)}
            title="Import users from CSV"
            type="button"
          >
            <FileUpIcon />
            <span className="hidden sm:ml-2 sm:inline">Import CSV</span>
          </button>
          <button
            aria-label="New user"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand text-white transition hover:bg-brand-hover sm:w-auto sm:px-4 sm:text-sm sm:font-semibold"
            onClick={() => setIsCreateModalOpen(true)}
            title="New user"
            type="button"
          >
            <PlusIcon />
            <span className="hidden sm:ml-2 sm:inline">New User</span>
          </button>
          </>
        }
        description={`Manage who can access ${appConfig.name}.`}
        title="Users"
      />

      <div>
        {areFiltersOpen && (
          <UserFiltersPanel
            filters={filters}
            onFiltersChange={setFilters}
            onShowInactiveUsersChange={setShowInactiveUsers}
            showInactiveUsers={showInactiveUsers}
          />
        )}
      </div>

      <div className="mt-5">
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
          currentUser={currentUser}
          mode="create"
          onClose={() => setIsCreateModalOpen(false)}
          onSaved={() => handleUserSaved("User created.")}
        />
      )}

      {isImportModalOpen && (
        <UserImportModal
          currentUser={currentUser}
          onClose={() => setIsImportModalOpen(false)}
          onImportCompleted={refreshUsers}
          onImported={handleUsersImported}
        />
      )}

      {editingUser && (
        <UserModal
          currentUser={currentUser}
          mode="edit"
          onClose={() => setEditingUser(null)}
          onSaved={() => handleUserSaved("User updated.")}
          user={editingUser}
        />
      )}
    </section>
  );
}
