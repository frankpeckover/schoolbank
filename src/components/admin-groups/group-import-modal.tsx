"use client";

import { useState, type ChangeEvent } from "react";
import { importGroups } from "@/lib/actions";
import { parseCsvObjects } from "@/lib/csv";
import type {
  ImportGroupError,
  ImportGroupMembershipInput,
} from "@/services/group-import-service";

type GroupImportModalProps = {
  onClose: () => void;
  onImportCompleted: () => void;
  onImported: (message: string, shouldClose?: boolean) => void;
};

type ParseResult =
  | {
      memberships: ImportGroupMembershipInput[];
      ok: true;
    }
  | {
      message: string;
      ok: false;
    };

const csvHeaders = "group_name,username,description";

export function GroupImportModal({
  onClose,
  onImportCompleted,
  onImported,
}: GroupImportModalProps) {
  const [fileName, setFileName] = useState("");
  const [memberships, setMemberships] = useState<ImportGroupMembershipInput[]>(
    [],
  );
  const [errors, setErrors] = useState<ImportGroupError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setMemberships([]);
    setErrors([]);
    setMessage(null);
    setError(null);

    if (!file) {
      setFileName("");
      return;
    }

    setFileName(file.name);

    const text = await file.text();
    const result = parseGroupsCsv(text);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMemberships(result.memberships);
    setMessage(`${result.memberships.length} memberships ready to import.`);
  }

  async function handleImport() {
    if (memberships.length === 0) {
      setError("Choose a CSV file with at least one group membership.");
      return;
    }

    setIsImporting(true);
    setError(null);
    setMessage(null);
    setErrors([]);

    const result = await importGroups({ memberships });
    const importedText = [
      `${result.createdMembershipCount} membership${result.createdMembershipCount === 1 ? "" : "s"}`,
      `${result.createdGroupCount} group${result.createdGroupCount === 1 ? "" : "s"}`,
    ].join(", ");
    const successMessage = `Imported ${importedText}.`;

    setIsImporting(false);
    setErrors(result.errors);
    setMessage(successMessage);
    onImportCompleted();
    onImported(successMessage, false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="theme-panel motion-pop w-full max-w-2xl p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">Import Groups</h3>
            <p className="mt-1 text-sm text-text-muted">
              Upload a CSV with headers: {csvHeaders}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Existing groups are reused. The description column is optional.
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
            htmlFor="groupCsvFile"
          >
            CSV file
          </label>
          <input
            accept=".csv,text/csv"
            className="mt-2 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none ring-brand transition file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white focus:ring-2"
            id="groupCsvFile"
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
            disabled={isImporting || memberships.length === 0}
            onClick={handleImport}
            type="button"
          >
            {isImporting ? "Importing..." : "Import Groups"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportErrors({ errors }: { errors: ImportGroupError[] }) {
  return (
    <div className="mt-4 rounded-md border border-danger-border bg-danger-soft p-3">
      <p className="text-sm font-semibold text-danger-strong">
        Some rows could not be imported.
      </p>
      <ul className="mt-2 max-h-40 overflow-y-auto text-sm text-danger-strong">
        {errors.map((error) => (
          <li key={`${error.rowNumber}-${error.groupName}-${error.username}`}>
            Row {error.rowNumber}
            {error.groupName ? ` (${error.groupName})` : ""}
            {error.username ? ` / ${error.username}` : ""}: {error.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function parseGroupsCsv(text: string): ParseResult {
  const { objects, rows } = parseCsvObjects(text);

  if (rows.length < 2) {
    return {
      ok: false,
      message: "CSV must include a header row and at least one membership row.",
    };
  }

  const memberships: ImportGroupMembershipInput[] = [];

  for (const { row, rowNumber, values } of objects) {
    if (row.every((value) => !value.trim())) {
      continue;
    }

    const membership = {
      description: values.description?.trim() ?? "",
      groupName: values.groupname?.trim() ?? "",
      username: values.username?.trim() ?? "",
    };

    if (!membership.groupName || !membership.username) {
      return {
        ok: false,
        message: `Row ${rowNumber} is missing a group name or username.`,
      };
    }

    memberships.push(membership);
  }

  if (memberships.length === 0) {
    return {
      ok: false,
      message: "CSV does not contain any group memberships.",
    };
  }

  return { memberships, ok: true };
}
