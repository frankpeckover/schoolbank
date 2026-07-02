import type { Role } from "@/lib/session";
import {
  type UserFormFieldChange,
  type UserFormState,
  type UserModalMode,
} from "@/components/admin-users/user-modal-types";
import { userRoles } from "@/components/admin-users/user-management-types";

type UserFormFieldsProps = {
  form: UserFormState;
  mode: UserModalMode;
  onChange: UserFormFieldChange;
};

export function UserFormFields({
  form,
  mode,
  onChange,
}: UserFormFieldsProps) {
  return (
    <>
      <NameFields form={form} onChange={onChange} />
      <AccountFields form={form} mode={mode} onChange={onChange} />
    </>
  );
}

function NameFields({
  form,
  onChange,
}: {
  form: UserFormState;
  onChange: UserFormFieldChange;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        id="firstName"
        label="First Name"
        onChange={(value) => onChange("firstName", value)}
        value={form.firstName}
      />
      <TextField
        id="lastName"
        label="Last Name"
        onChange={(value) => onChange("lastName", value)}
        value={form.lastName}
      />
    </div>
  );
}

function AccountFields({
  form,
  mode,
  onChange,
}: {
  form: UserFormState;
  mode: UserModalMode;
  onChange: UserFormFieldChange;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="username"
          label="Username"
          onChange={(value) => onChange("username", value)}
          value={form.username}
        />
        <div>
          <label className="text-sm font-semibold text-text-control" htmlFor="role">
            Role
          </label>
          <select
            className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
            id="role"
            onChange={(event) => onChange("role", event.target.value as Role)}
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

      <TextField
        id="email"
        label="Email"
        onChange={(value) => onChange("email", value)}
        type="email"
        value={form.email}
      />
      <TextField
        id="profileImageUrl"
        label="Profile Image URL"
        onChange={(value) => onChange("profileImageUrl", value)}
        value={form.profileImageUrl}
      />

      {mode === "create" ? (
        <TextField
          id="password"
          label="Password"
          onChange={(value) => onChange("password", value)}
          type="password"
          value={form.password}
        />
      ) : (
        <label className="flex items-center gap-2 text-sm font-semibold text-text-control">
          <input
            checked={form.isActive}
            className="h-4 w-4"
            onChange={(event) => onChange("isActive", event.target.checked)}
            type="checkbox"
          />
          Active user
        </label>
      )}
    </>
  );
}

function TextField({
  id,
  label,
  onChange,
  type = "text",
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  type?: string;
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
        type={type}
        value={value}
      />
    </div>
  );
}
