"use client";

import { useEffect, useMemo, useState } from "react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { FileUpIcon, FilterIcon, PlusIcon, UsersIcon } from "@/components/ui/icons";
import { PanelToolbar } from "@/components/ui/panel-toolbar";
import type { UserListItem } from "@/services/user-service";

type AdminUsersPanelProps = {
  schoolName: string;
};

const visibleUserLimit = 100;

export function AdminUsersPanel({ schoolName }: AdminUsersPanelProps) {
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

  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        matchesUserFilters(user, filters, showInactiveUsers),
      ),
    [filters, showInactiveUsers, users],
  );
  const visibleUsers = filteredUsers.slice(0, visibleUserLimit);

  return (
    <section
      aria-label={`${schoolName} users`}
      className="theme-panel motion-panel mt-5 p-5"
    >
      <PanelToolbar
        actions={
          <>
            <IconButton
              ariaExpanded={areFiltersOpen}
              label={areFiltersOpen ? "Hide filters" : "Show filters"}
              onClick={() => setAreFiltersOpen((isOpen) => !isOpen)}
              text="Filters"
            >
              <FilterIcon />
            </IconButton>
            <IconButton
              label="Import users from CSV"
              onClick={() => setIsImportModalOpen(true)}
              text="Import CSV"
            >
              <FileUpIcon />
            </IconButton>
            <IconButton
              label="New user"
              onClick={() => setIsCreateModalOpen(true)}
              text="New User"
              tone="primary"
            >
              <PlusIcon />
            </IconButton>
          </>
        }
      >
        {!isLoading && !error && filteredUsers.length > 0 && (
          <ListCount
            count={visibleUsers.length}
            label="users"
            totalCount={filteredUsers.length}
          />
        )}
      </PanelToolbar>

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
            users={visibleUsers}
          />
        )}
        {!isLoading && !error && filteredUsers.length === 0 && (
          <EmptyState
            description={
              users.length === 0
                ? "Add a user or import a CSV to start setting up accounts."
                : "Try changing or clearing the filters to see more accounts."
            }
            icon={<UsersIcon />}
            title={users.length === 0 ? "No users yet" : "No matching users"}
          />
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

function ListCount({
  count,
  label,
  totalCount,
}: {
  count: number;
  label: string;
  totalCount: number;
}) {
  return (
    <p className="text-sm font-semibold text-text-muted">
      Showing {count} of {totalCount} {label}.
    </p>
  );
}
