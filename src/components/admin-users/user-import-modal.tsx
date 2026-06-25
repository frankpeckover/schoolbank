"use client";

import { useState, type ChangeEvent } from "react";
import { importUsers } from "@/lib/actions";
import { downloadCsv } from "@/lib/client-csv";
import { parseCsvObjects } from "@/lib/csv";
import type { Role } from "@/lib/session";
import type {
  ImportedUserCredential,
  ImportUserInput,
  ImportUserError,
} from "@/services/user-service";

type UserImportModalProps = {
  onClose: () => void;
  onImportCompleted: () => void;
  onImported: (message: string, shouldClose?: boolean) => void;
};

type ParseResult =
  | {
      ok: true;
      users: ImportUserInput[];
    }
  | {
      ok: false;
      message: string;
    };

const csvHeaders = "username,first_name,last_name,email,role";
const validRoles: Role[] = ["admin", "teacher", "student"];

export function UserImportModal({
  onClose,
  onImportCompleted,
  onImported,
}: UserImportModalProps) {
  const [fileName, setFileName] = useState("");
  const [users, setUsers] = useState<ImportUserInput[]>([]);
  const [createdUsers, setCreatedUsers] = useState<ImportedUserCredential[]>(
    [],
  );
  const [errors, setErrors] = useState<ImportUserError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setUsers([]);
    setCreatedUsers([]);
    setErrors([]);
    setMessage(null);
    setError(null);

    if (!file) {
      setFileName("");
      return;
    }

    setFileName(file.name);

    const text = await file.text();
    const result = parseUsersCsv(text);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setUsers(result.users);
    setMessage(`${result.users.length} users ready to import.`);
  }

  async function handleImport() {
    if (users.length === 0) {
      setError("Choose a CSV file with at least one user.");
      return;
    }

    setIsImporting(true);
    setError(null);
    setMessage(null);
    setErrors([]);
    setCreatedUsers([]);

    const result = await importUsers({ users });

    setIsImporting(false);
    setErrors(result.errors);
    setCreatedUsers(result.createdUsers);

    if (result.createdCount > 0) {
      const successMessage = `Imported ${result.createdCount} user${result.createdCount === 1 ? "" : "s"}.`;

      setMessage(successMessage);
      onImportCompleted();
      onImported(successMessage, false);
      return;
    }

    setMessage("No users were imported.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="theme-panel motion-pop w-full max-w-2xl p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">Import Users</h3>
            <p className="mt-1 text-sm text-text-muted">
              Upload a CSV with headers: {csvHeaders}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Existing usernames or emails are skipped and reported below.
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

        <div className="theme-subpanel mt-5 p-4">
          <label
            className="text-sm font-semibold text-text-control"
            htmlFor="csvFile"
          >
            CSV file
          </label>
          <input
            accept=".csv,text/csv"
            className="mt-2 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none ring-brand transition file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white focus:ring-2"
            id="csvFile"
            onChange={handleFileChange}
            type="file"
          />
          {fileName && (
            <p className="mt-2 text-sm text-text-muted">{fileName}</p>
          )}
        </div>

        {message && (
          <p className="mt-4 rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-semibold text-success">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
            {error}
          </p>
        )}

        {errors.length > 0 && (
          <ImportErrors errors={errors} />
        )}

        {createdUsers.length > 0 && (
          <GeneratedPasswords users={createdUsers} />
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="rounded-md border border-button-border px-4 py-2 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isImporting || users.length === 0}
            onClick={handleImport}
            type="button"
          >
            {isImporting ? "Importing..." : "Import Users"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportErrors({ errors }: { errors: ImportUserError[] }) {
  return (
    <div className="mt-4 rounded-md border border-danger-border bg-danger-soft p-3">
      <p className="text-sm font-semibold text-danger-strong">
        Some rows could not be imported.
      </p>
      <ul className="mt-2 max-h-40 overflow-y-auto text-sm text-danger-strong">
        {errors.map((error) => (
          <li key={`${error.rowNumber}-${error.username}`}>
            Row {error.rowNumber}
            {error.username ? ` (${error.username})` : ""}: {error.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function GeneratedPasswords({ users }: { users: ImportedUserCredential[] }) {
  return (
    <div className="theme-subpanel mt-4 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text-control">
          Temporary passwords
        </p>
        <button
          className="rounded-md border border-button-border px-3 py-2 text-sm font-semibold text-text-control transition hover:bg-surface-hover"
          onClick={() => downloadPasswordCsv(users)}
          type="button"
        >
          Download CSV
        </button>
      </div>
      <div className="mt-2 max-h-44 overflow-y-auto pr-1">
        <div className="grid gap-2 md:hidden">
          {users.map((user) => (
            <GeneratedPasswordCard key={user.username} user={user} />
          ))}
        </div>

        <table className="hidden w-full text-left text-sm md:table">
          <thead className="text-text-muted">
            <tr>
              <th className="py-2 pr-4 font-semibold">Username</th>
              <th className="py-2 font-semibold">Password</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr className="border-t border-border-subtle" key={user.username}>
                <td className="py-2 pr-4 font-semibold">{user.username}</td>
                <td className="py-2 font-mono text-text-control">
                  {user.temporaryPassword}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function downloadPasswordCsv(users: ImportedUserCredential[]) {
  downloadCsv(
    "imported-user-passwords.csv",
    ["username", "temporary_password"],
    users.map((user) => [user.username, user.temporaryPassword]),
  );
}

function GeneratedPasswordCard({
  user,
}: {
  user: ImportedUserCredential;
}) {
  return (
    <article className="rounded-md border border-border-subtle bg-surface p-3">
      <p className="truncate text-sm font-semibold">{user.username}</p>
      <p className="mt-1 break-all font-mono text-sm text-text-control">
        {user.temporaryPassword}
      </p>
    </article>
  );
}

function parseUsersCsv(text: string): ParseResult {
  const { objects, rows } = parseCsvObjects(text);

  if (rows.length < 2) {
    return {
      ok: false,
      message: "CSV must include a header row and at least one user row.",
    };
  }

  const users: ImportUserInput[] = [];

  for (const { row, rowNumber, values } of objects) {
    if (row.every((value) => !value.trim())) {
      continue;
    }

    const role = values.role?.trim().toLowerCase() as Role;

    if (!validRoles.includes(role)) {
      return {
        ok: false,
        message: `Row ${rowNumber} has an invalid role.`,
      };
    }

    const user = {
      email: values.email?.trim() ?? "",
      firstName: values.firstname?.trim() ?? "",
      lastName: values.lastname?.trim() ?? "",
      role,
      username: values.username?.trim() ?? "",
    };

    if (
      !user.username ||
      !user.firstName ||
      !user.lastName ||
      !user.email
    ) {
      return {
        ok: false,
        message: `Row ${rowNumber} is missing a required value.`,
      };
    }

    users.push(user);
  }

  if (users.length === 0) {
    return {
      ok: false,
      message: "CSV does not contain any users.",
    };
  }

  return { ok: true, users };
}
