"use client";

import { useEffect, useMemo, useState } from "react";
import { listUsers, setUserActive } from "@/lib/actions";
import { matchesUserFilters } from "@/components/admin-users/user-filter-utils";
import {
  emptyFilters,
  type UserFilters,
} from "@/components/admin-users/user-management-types";
import { UserImportModal } from "@/components/admin-users/user-import-modal";
import { UserModal } from "@/components/admin-users/user-modal";
import { UsersTable } from "@/components/admin-users/users-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { AdminPageSection } from "@/components/ui/admin-page-section";
import { IconButton } from "@/components/ui/icon-button";
import { FileDownIcon, FileUpIcon, PlusIcon, UsersIcon } from "@/components/ui/icons";
import {
  ListPagination,
  usePagedList,
} from "@/components/ui/list-pagination";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import { TableToolbar } from "@/components/ui/table-toolbar";
import { downloadCsv } from "@/lib/client-csv";
import { formatDateTime } from "@/lib/formatters";
import type { UserListItem } from "@/services/user-service";
import type { UserFormState } from "@/components/admin-users/user-modal-types";

type AdminUsersPanelProps = {
  schoolName: string;
};

export function AdminUsersPanel({ schoolName }: AdminUsersPanelProps) {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filters, setFilters] = useState<UserFilters>(emptyFilters);
  const [showInactiveUsers, setShowInactiveUsers] = useState(false);
  const [duplicatingUserForm, setDuplicatingUserForm] =
    useState<Partial<UserFormState> | null>(null);
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
    setDuplicatingUserForm(null);
    setEditingUser(null);
    setIsCreateModalOpen(false);
    setMessage(messageText);
    refreshUsers();
  }

  function handleDuplicateUser(user: UserListItem) {
    setEditingUser(null);
    setDuplicatingUserForm({
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      role: user.role,
    });
    setIsCreateModalOpen(true);
  }

  function handleUsersImported(messageText: string, shouldClose = true) {
    setMessage(messageText);

    if (shouldClose) {
      setIsImportModalOpen(false);
    }
  }

  async function handleSetUserActive(user: UserListItem, isActive: boolean) {
    setError(null);
    setMessage(null);

    const result = await setUserActive(user.id, isActive);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(isActive ? "User enabled." : "User disabled.");
    await refreshUsers();
  }

  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        matchesUserFilters(user, filters, showInactiveUsers),
      ),
    [filters, showInactiveUsers, users],
  );
  const {
    page,
    pageItems: visibleUsers,
    setPage,
    totalPages,
  } = usePagedList(filteredUsers);

  return (
    <AdminPageSection ariaLabel={`${schoolName} users`} isFlush>
      <FixedNotification error={error} message={message} />
      <div>
        {isLoading && <p className="text-sm text-text-muted">Loading users...</p>}
        {!isLoading && !error && filteredUsers.length > 0 && (
          <>
            <UsersTable
              filters={filters}
              onFiltersChange={setFilters}
              onDuplicate={handleDuplicateUser}
              onEdit={setEditingUser}
              onShowInactiveUsersChange={setShowInactiveUsers}
              onUserActiveChange={handleSetUserActive}
              showInactiveUsers={showInactiveUsers}
              toolbar={
                <TableToolbar
                  actions={
                    <>
                      <IconButton
                        label="New user"
                        onClick={() => setIsCreateModalOpen(true)}
                        text="New User"
                        tone="primary"
                      >
                        <PlusIcon />
                      </IconButton>
                      <TableActionMenu
                        label="Open user table tools"
                        items={[
                          {
                            disabled: filteredUsers.length === 0,
                            icon: <FileDownIcon />,
                            label: "Export users",
                            onSelect: () => downloadUsers(filteredUsers),
                          },
                          {
                            icon: <FileUpIcon />,
                            label: "Import users from CSV",
                            onSelect: () => setIsImportModalOpen(true),
                          },
                        ]}
                      />
                    </>
                  }
                >
                  <ListCount
                    count={visibleUsers.length}
                    label="users"
                    totalCount={filteredUsers.length}
                  />
                </TableToolbar>
              }
              users={visibleUsers}
            />
            <ListPagination
              onPageChange={setPage}
              page={page}
              totalCount={filteredUsers.length}
              totalPages={totalPages}
            />
          </>
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
          initialForm={duplicatingUserForm ?? undefined}
          mode="create"
          onClose={() => {
            setDuplicatingUserForm(null);
            setIsCreateModalOpen(false);
          }}
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
    </AdminPageSection>
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

function downloadUsers(users: UserListItem[]) {
  downloadCsv(
    "users.csv",
    [
      "id",
      "username",
      "first_name",
      "last_name",
      "display_name",
      "email",
      "role",
      "status",
      "last_activity",
      "profile_image_url",
    ],
    users.map((user) => [
      user.id,
      user.username,
      user.firstName,
      user.lastName,
      user.displayName,
      user.email,
      user.role,
      user.isActive ? "active" : "inactive",
      user.lastActivityAt ? formatDateTime(user.lastActivityAt) : "",
      user.profileImageUrl,
    ]),
  );
}
