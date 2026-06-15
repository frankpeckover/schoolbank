import type { UserListItem } from "@/services/user-service";

type UsersTableProps = {
  onEdit: (user: UserListItem) => void;
  users: UserListItem[];
};

export function UsersTable({ onEdit, users }: UsersTableProps) {
  return (
    <table className="w-full min-w-[860px] border-collapse text-left text-sm">
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
        {users.map((user) => (
          <tr className="border-b border-border-subtle" key={user.id}>
            <td className="py-3 pr-4 font-semibold">{user.firstName}</td>
            <td className="py-3 pr-4 font-semibold">{user.lastName}</td>
            <td className="py-3 pr-4 text-text-muted">{user.username}</td>
            <td className="py-3 pr-4 text-text-muted">{user.email}</td>
            <td className="py-3 pr-4 capitalize text-text-muted">{user.role}</td>
            <td className="py-3 pr-4">
              <UserStatusBadge isActive={user.isActive} />
            </td>
            <td className="py-3">
              <button
                className="rounded-md border border-button-border px-3 py-2 text-sm font-semibold text-text-control transition hover:bg-surface"
                onClick={() => onEdit(user)}
                type="button"
              >
                Edit
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
