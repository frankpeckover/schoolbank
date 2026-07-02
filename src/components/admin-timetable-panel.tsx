"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  createTimetableEntry,
  listGroups,
  listTimetableEntries,
  listTimetableTeachers,
  setTimetableEntryActive,
} from "@/lib/actions";
import { TimetableImportModal } from "@/components/admin-timetable/timetable-import-modal";
import { ClockIcon, FileUpIcon, PlusIcon, XIcon } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import type { GroupListItem } from "@/services/group-service";
import type {
  CreateTimetableEntryInput,
  TimetableEntry,
  TimetableTeacher,
} from "@/services/timetable-service";

const weekDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const defaultTimetableDayIndex = 1;

const emptyEntryForm: CreateTimetableEntryInput = {
  dayOfWeek: defaultTimetableDayIndex,
  endTime: "",
  groupId: "",
  startTime: "",
  teacherUserId: "",
};

export function AdminTimetablePanel() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [teachers, setTeachers] = useState<TimetableTeacher[]>([]);
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [form, setForm] =
    useState<CreateTimetableEntryInput>(emptyEntryForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeGroups = useMemo(
    () => groups.filter((group) => group.isActive),
    [groups],
  );

  useEffect(() => {
    refreshTimetable();
  }, [showInactive]);

  async function refreshTimetable() {
    setIsLoading(true);

    try {
      const [loadedEntries, loadedTeachers, loadedGroups] = await Promise.all([
        listTimetableEntries(showInactive),
        listTimetableTeachers(),
        listGroups(false),
      ]);

      setEntries(loadedEntries);
      setTeachers(loadedTeachers);
      setGroups(loadedGroups);
      setError(null);
    } catch {
      setError("Could not load timetable.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateEntry() {
    setIsSaving(true);

    const result = await createTimetableEntry(form);

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    setForm(emptyEntryForm);
    setIsFormOpen(false);
    setMessage("Timetable entry created.");
    setError(null);
    setIsSaving(false);
    await refreshTimetable();
  }

  async function handleSetEntryActive(entryId: string, isActive: boolean) {
    const result = await setTimetableEntryActive(entryId, isActive);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(isActive ? "Timetable entry restored." : "Timetable entry archived.");
    setError(null);
    await refreshTimetable();
  }

  async function handleTimetableImported(
    messageText: string,
    shouldClose = true,
  ) {
    setMessage(messageText);
    setError(null);

    if (shouldClose) {
      setIsImportModalOpen(false);
    }

    await refreshTimetable();
  }

  return (
    <section className="theme-panel motion-panel mt-5 p-4">
      <PageHeader
        actions={
          <>
            <IconButton
              label="Import timetable"
              onClick={() => setIsImportModalOpen(true)}
            >
              <FileUpIcon />
            </IconButton>
            <IconButton
              ariaExpanded={isFormOpen}
              label="Add timetable entry"
              onClick={() => setIsFormOpen((isOpen) => !isOpen)}
              tone="primary"
            >
              <PlusIcon />
            </IconButton>
          </>
        }
        icon={<ClockIcon />}
        title="Timetable"
        titleSize="base"
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-text-control">
          <input
            checked={showInactive}
            className="h-4 w-4 accent-brand"
            onChange={(event) => setShowInactive(event.target.checked)}
            type="checkbox"
          />
          Show archived
        </label>
      </div>

      {isFormOpen && (
        <TimetableEntryForm
          form={form}
          groups={activeGroups}
          isSaving={isSaving}
          onCancel={() => setIsFormOpen(false)}
          onChange={setForm}
          onSubmit={handleCreateEntry}
          teachers={teachers}
        />
      )}

      {isImportModalOpen && (
        <TimetableImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImported={handleTimetableImported}
        />
      )}

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

      <div className="mt-5">
        {isLoading && (
          <p className="text-sm text-text-muted">Loading timetable...</p>
        )}
        {!isLoading && entries.length === 0 && (
          <p className="text-sm text-text-muted">
            Timetable entries will appear here after they are created.
          </p>
        )}
        {!isLoading && entries.length > 0 && (
          <div className="grid gap-3 lg:grid-cols-2">
            {entries.map((entry) => (
              <TimetableEntryCard
                entry={entry}
                key={entry.id}
                onSetActive={handleSetEntryActive}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TimetableEntryForm({
  form,
  groups,
  isSaving,
  onCancel,
  onChange,
  onSubmit,
  teachers,
}: {
  form: CreateTimetableEntryInput;
  groups: GroupListItem[];
  isSaving: boolean;
  onCancel: () => void;
  onChange: (form: CreateTimetableEntryInput) => void;
  onSubmit: () => void;
  teachers: TimetableTeacher[];
}) {
  return (
    <form
      className="theme-subpanel mt-4 grid gap-3 p-3 lg:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <SelectField
        label="Teacher"
        onChange={(value) => onChange({ ...form, teacherUserId: value })}
        value={form.teacherUserId}
      >
        <option value="">Select teacher</option>
        {teachers.map((teacher) => (
          <option key={teacher.id} value={teacher.id}>
            {teacher.displayName} ({teacher.username})
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Group"
        onChange={(value) => onChange({ ...form, groupId: value })}
        value={form.groupId}
      >
        <option value="">Select group</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Day"
        onChange={(value) =>
          onChange({ ...form, dayOfWeek: Number(value) })
        }
        value={String(form.dayOfWeek)}
      >
        {weekDays.map((day, index) => (
          <option key={day} value={index}>
            {day}
          </option>
        ))}
      </SelectField>

      <div className="grid grid-cols-2 gap-3">
        <TimeField
          label="Start"
          onChange={(value) => onChange({ ...form, startTime: value })}
          value={form.startTime}
        />
        <TimeField
          label="End"
          onChange={(value) => onChange({ ...form, endTime: value })}
          value={form.endTime}
        />
      </div>

      <div className="flex flex-col-reverse gap-2 lg:col-span-2 sm:flex-row sm:justify-end">
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
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

function SelectField({
  children,
  label,
  onChange,
  value,
}: {
  children: ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="text-sm font-semibold text-text-control">
      {label}
      <select
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

function TimeField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="text-sm font-semibold text-text-control">
      {label}
      <input
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        onChange={(event) => onChange(event.target.value)}
        type="time"
        value={value}
      />
    </label>
  );
}

function TimetableEntryCard({
  entry,
  onSetActive,
}: {
  entry: TimetableEntry;
  onSetActive: (entryId: string, isActive: boolean) => void;
}) {
  return (
    <article className="theme-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{entry.groupName}</h3>
          <p className="mt-1 truncate text-sm text-text-muted">
            {entry.teacherName}
          </p>
        </div>
        <button
          aria-label={entry.isActive ? "Archive timetable entry" : undefined}
          className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
            entry.isActive
              ? "border-danger-button-border text-danger-strong hover:bg-danger-soft"
              : "border-button-border text-text-control hover:bg-panel-soft"
          }`}
          onClick={() => onSetActive(entry.id, !entry.isActive)}
          type="button"
        >
          {entry.isActive ? <XIcon /> : "Restore"}
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-text-muted">
        <span className="rounded-full bg-panel-soft px-3 py-1">
          {weekDays[entry.dayOfWeek]}
        </span>
        <span className="rounded-full bg-panel-soft px-3 py-1">
          {entry.startTime} - {entry.endTime}
        </span>
        {!entry.isActive && (
          <span className="rounded-full bg-danger-soft px-3 py-1 text-danger-strong">
            Archived
          </span>
        )}
      </div>
    </article>
  );
}
