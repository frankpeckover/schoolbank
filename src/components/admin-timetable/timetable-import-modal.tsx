"use client";

import { useState, type ChangeEvent } from "react";
import { importTimetableEntries } from "@/lib/actions";
import { parseCsvObjects } from "@/lib/csv";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import type {
  ImportTimetableEntryError,
  ImportTimetableEntryInput,
} from "@/services/timetable-import-service";

type TimetableImportModalProps = {
  onClose: () => void;
  onImported: (message: string, shouldClose?: boolean) => void;
};

type ParseResult =
  | {
      entries: ImportTimetableEntryInput[];
      ok: true;
    }
  | {
      message: string;
      ok: false;
    };

const csvHeaders = "teacher_username,group_name,day,start_time,end_time";

export function TimetableImportModal({
  onClose,
  onImported,
}: TimetableImportModalProps) {
  const [fileName, setFileName] = useState("");
  const [entries, setEntries] = useState<ImportTimetableEntryInput[]>([]);
  const [errors, setErrors] = useState<ImportTimetableEntryError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setEntries([]);
    setErrors([]);
    setMessage(null);
    setError(null);

    if (!file) {
      setFileName("");
      return;
    }

    setFileName(file.name);

    const text = await file.text();
    const result = parseTimetableCsv(text);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setEntries(result.entries);
    setMessage(`${result.entries.length} timetable entries ready to import.`);
  }

  async function handleImport() {
    if (entries.length === 0) {
      setError("Choose a CSV file with at least one timetable entry.");
      return;
    }

    setIsImporting(true);
    setError(null);
    setMessage(null);
    setErrors([]);

    const result = await importTimetableEntries({ entries });
    const successMessage = [
      `Imported ${result.createdCount} entr${result.createdCount === 1 ? "y" : "ies"}`,
      `${result.duplicateCount} duplicate${result.duplicateCount === 1 ? "" : "s"} skipped`,
    ].join(". ");

    setIsImporting(false);
    setErrors(result.errors);
    setMessage(successMessage);
    onImported(successMessage, false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="theme-panel motion-pop w-full max-w-2xl p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold">Import Timetable</h3>
            <p className="mt-1 text-sm text-text-muted">
              Upload a CSV with headers: {csvHeaders}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Teachers and groups must already exist. Day can be a weekday name
              or a number from 0 to 6.
            </p>
          </div>
          <ModalCloseButton onClick={onClose} />
        </div>

        <div className="theme-subpanel mt-5 p-4">
          <label
            className="text-sm font-semibold text-text-control"
            htmlFor="timetableCsvFile"
          >
            CSV file
          </label>
          <input
            accept=".csv,text/csv"
            className="mt-2 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none ring-brand transition file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white focus:ring-2"
            id="timetableCsvFile"
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

        {errors.length > 0 && <ImportErrors errors={errors} />}

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
            disabled={isImporting || entries.length === 0}
            onClick={handleImport}
            type="button"
          >
            {isImporting ? "Importing..." : "Import Timetable"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportErrors({ errors }: { errors: ImportTimetableEntryError[] }) {
  return (
    <div className="mt-4 rounded-md border border-danger-border bg-danger-soft p-3">
      <p className="text-sm font-semibold text-danger-strong">
        Some rows could not be imported.
      </p>
      <ul className="mt-2 max-h-40 overflow-y-auto text-sm text-danger-strong">
        {errors.map((error) => (
          <li
            key={`${error.rowNumber}-${error.teacherUsername}-${error.groupName}`}
          >
            Row {error.rowNumber}
            {error.teacherUsername ? ` (${error.teacherUsername})` : ""}
            {error.groupName ? ` / ${error.groupName}` : ""}: {error.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function parseTimetableCsv(text: string): ParseResult {
  const { objects, rows } = parseCsvObjects(text);

  if (rows.length < 2) {
    return {
      ok: false,
      message: "CSV must include a header row and at least one timetable row.",
    };
  }

  const entries: ImportTimetableEntryInput[] = [];

  for (const { row, rowNumber, values } of objects) {
    if (row.every((value) => !value.trim())) {
      continue;
    }

    const entry = {
      day: values.day?.trim() ?? "",
      endTime: values.endtime?.trim() ?? "",
      groupName: values.groupname?.trim() ?? "",
      startTime: values.starttime?.trim() ?? "",
      teacherUsername: values.teacherusername?.trim() ?? "",
    };

    if (
      !entry.teacherUsername ||
      !entry.groupName ||
      !entry.day ||
      !entry.startTime ||
      !entry.endTime
    ) {
      return {
        ok: false,
        message: `Row ${rowNumber} is missing a required timetable value.`,
      };
    }

    entries.push(entry);
  }

  if (entries.length === 0) {
    return {
      ok: false,
      message: "CSV does not contain any timetable entries.",
    };
  }

  return { entries, ok: true };
}
