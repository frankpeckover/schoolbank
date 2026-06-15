"use client";

import { useState, type FormEvent } from "react";
import {
  createUser,
  resetUserPassword,
  updateUser,
} from "@/lib/actions";
import type {
  CreateUserInput,
  UpdateUserInput,
  UserListItem,
} from "@/services/user-service";
import type { Role } from "@/lib/session";
import { userRoles } from "@/components/admin-users/user-management-types";

type UserModalProps = {
  mode: "create" | "edit";
  onClose: () => void;
  onSaved: () => void;
  user?: UserListItem;
};

type UserFormState = CreateUserInput & {
  id: string;
  isActive: boolean;
};

const emptyForm: UserFormState = {
  id: "",
  username: "",
  firstName: "",
  lastName: "",
  email: "",
  role: "student",
  password: "",
  isActive: true,
};

export function UserModal({ mode, onClose, onSaved, user }: UserModalProps) {
  const [form, setForm] = useState<UserFormState>(() =>
    getInitialFormState(mode, user),
  );
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const result =
      mode === "create"
        ? await createUser(form)
        : await updateUser(getUpdateUserInput(form));

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    onSaved();
  }

  async function handlePasswordReset() {
    setIsResettingPassword(true);
    setError(null);
    setMessage(null);

    const result = await resetUserPassword({
      id: form.id,
      password: newPassword,
    });

    if (!result.ok) {
      setError(result.message);
      setIsResettingPassword(false);
      return;
    }

    setNewPassword("");
    setMessage("Password reset.");
    setIsResettingPassword(false);
  }

  function updateFormField<Field extends keyof UserFormState>(
    field: Field,
    value: UserFormState[Field],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-lg rounded-md border border-border bg-surface p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold">
              {mode === "create" ? "New User" : "Edit User"}
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              {mode === "create"
                ? "Create a user for this school."
                : "Update user details and access."}
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
          <NameFields form={form} onChange={updateFormField} />
          <AccountFields form={form} mode={mode} onChange={updateFormField} />

          {error && (
            <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-semibold text-success">
              {message}
            </p>
          )}

          <ModalActions
            isSaving={isSaving}
            mode={mode}
            onCancel={onClose}
          />
        </form>

        {mode === "edit" && (
          <PasswordResetSection
            isResettingPassword={isResettingPassword}
            newPassword={newPassword}
            onNewPasswordChange={setNewPassword}
            onPasswordReset={handlePasswordReset}
          />
        )}
      </div>
    </div>
  );
}

function NameFields({
  form,
  onChange,
}: {
  form: UserFormState;
  onChange: <Field extends keyof UserFormState>(
    field: Field,
    value: UserFormState[Field],
  ) => void;
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
  mode: UserModalProps["mode"];
  onChange: <Field extends keyof UserFormState>(
    field: Field,
    value: UserFormState[Field],
  ) => void;
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

function ModalActions({
  isSaving,
  mode,
  onCancel,
}: {
  isSaving: boolean;
  mode: UserModalProps["mode"];
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        className="rounded-md border border-button-border px-4 py-3 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
        onClick={onCancel}
        type="button"
      >
        Cancel
      </button>
      <button
        className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isSaving}
        type="submit"
      >
        {isSaving
          ? "Saving..."
          : mode === "create"
            ? "Create User"
            : "Save User"}
      </button>
    </div>
  );
}

function PasswordResetSection({
  isResettingPassword,
  newPassword,
  onNewPasswordChange,
  onPasswordReset,
}: {
  isResettingPassword: boolean;
  newPassword: string;
  onNewPasswordChange: (password: string) => void;
  onPasswordReset: () => void;
}) {
  return (
    <div className="mt-5 border-t border-border-subtle pt-5">
      <h4 className="text-lg font-semibold">Reset Password</h4>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          className="w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
          onChange={(event) => onNewPasswordChange(event.target.value)}
          placeholder="New password"
          type="password"
          value={newPassword}
        />
        <button
          className="rounded-md border border-button-border px-4 py-3 text-sm font-semibold text-text-control transition hover:bg-panel-soft disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isResettingPassword}
          onClick={onPasswordReset}
          type="button"
        >
          {isResettingPassword ? "Resetting..." : "Reset"}
        </button>
      </div>
    </div>
  );
}

function getInitialFormState(
  mode: UserModalProps["mode"],
  user?: UserListItem,
): UserFormState {
  if (mode === "edit" && user) {
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      password: "",
      isActive: user.isActive,
    };
  }

  return emptyForm;
}

function getUpdateUserInput(form: UserFormState): UpdateUserInput {
  return {
    id: form.id,
    username: form.username,
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    role: form.role,
    isActive: form.isActive,
  };
}
