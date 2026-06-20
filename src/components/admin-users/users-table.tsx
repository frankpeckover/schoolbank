import { IconButton } from "@/components/ui/icon-button";
import { PencilIcon } from "@/components/ui/icons";
import type { UserListItem } from "@/services/user-service";

type UsersTableProps = {
  onEdit: (user: UserListItem) => void;
  users: UserListItem[];
};

export function UsersTable({ onEdit, users }: UsersTableProps) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {users.map((user) => (
          <UserCard key={user.id} onEdit={onEdit} user={user} />
        ))}
      </div>

      <table className="hidden w-full border-collapse text-left text-sm md:table">
        <thead>
          <tr className="border-b border-border-subtle text-text-muted">
            <th className="py-3 pr-4 font-semibold">Name</th>
            <th className="py-3 pr-4 font-semibold">Username</th>
            <th className="py-3 pr-4 font-semibold">Email</th>
            <th className="py-3 pr-4 font-semibold">Role</th>
            <th className="py-3 pr-4 font-semibold">Status</th>
            <th className="py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr className="border-b border-border-subtle" key={user.id}>
              <td className="py-3 pr-4 font-semibold">{user.displayName}</td>
              <td className="py-3 pr-4 text-text-muted">{user.username}</td>
              <td className="py-3 pr-4 text-text-muted">{user.email}</td>
              <td className="py-3 pr-4 capitalize text-text-muted">{user.role}</td>
              <td className="py-3 pr-4">
                <UserStatusBadge isActive={user.isActive} />
              </td>
              <td className="py-3">
                <IconButton label={`Edit ${user.displayName}`} onClick={() => onEdit(user)}>
                  <PencilIcon />
                </IconButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function UserCard({
  onEdit,
  user,
}: {
  onEdit: (user: UserListItem) => void;
  user: UserListItem;
}) {
  return (
    <article className="rounded-md border border-border-subtle bg-panel-soft p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{user.displayName}</h3>
          <p className="truncate text-sm text-text-muted">{user.username}</p>
        </div>
        <IconButton label={`Edit ${user.displayName}`} onClick={() => onEdit(user)}>
          <PencilIcon />
        </IconButton>
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        <p className="truncate text-text-muted">{user.email}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="capitalize text-text-muted">{user.role}</span>
          <UserStatusBadge isActive={user.isActive} />
        </div>
      </div>
    </article>
  );
}

function UserStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`rounded-sm px-2 py-1 text-xs font-semibold ${
        isActive ? "bg-chip-bg text-chip-text" : "bg-danger-soft text-danger-strong"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}
