"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  createTimetableEntry,
  deleteTimetableEntry,
  listGroups,
  listTimetableEntries,
  listTimetableTeachers,
  updateTimetableEntry,
} from "@/lib/actions";
import { TimetableImportModal } from "@/components/admin-timetable/timetable-import-modal";
import {
  FileDownIcon,
  FileUpIcon,
  FilterIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { PanelToolbar } from "@/components/ui/panel-toolbar";
import { StatusBadge } from "@/components/ui/status-badge";
import { downloadCsv } from "@/lib/client-csv";
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

type TimetableFiltersState = {
  dayOfWeek: string;
  groupId: string;
  teacherUserId: string;
};

const emptyTimetableFilters: TimetableFiltersState = {
  dayOfWeek: "",
  groupId: "",
  teacherUserId: "",
};

export function AdminTimetablePanel() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [teachers, setTeachers] = useState<TimetableTeacher[]>([]);
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [form, setForm] =
    useState<CreateTimetableEntryInput>(emptyEntryForm);
  const [filters, setFilters] =
    useState<TimetableFiltersState>(emptyTimetableFilters);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeGroups = useMemo(
    () => groups.filter((group) => group.isActive),
    [groups],
  );
  const filteredEntries = useMemo(
    () => entries.filter((entry) => matchesTimetableFilters(entry, filters)),
    [entries, filters],
  );

  useEffect(() => {
    refreshTimetable();
  }, []);

  async function refreshTimetable() {
    setIsLoading(true);

    try {
      const [loadedEntries, loadedTeachers, loadedGroups] = await Promise.all([
        listTimetableEntries(false),
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
    setIsCreateModalOpen(false);
    setMessage("Timetable entry created.");
    setError(null);
    setIsSaving(false);
    await refreshTimetable();
  }

  async function handleUpdateEntry() {
    if (!editingEntry) {
      return;
    }

    setIsSaving(true);

    const result = await updateTimetableEntry({
      ...form,
      id: editingEntry.id,
    });

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    setEditingEntry(null);
    setForm(emptyEntryForm);
    setMessage("Timetable entry updated.");
    setError(null);
    setIsSaving(false);
    await refreshTimetable();
  }

  async function handleDeleteEntry(entry: TimetableEntry) {
    const shouldDelete = window.confirm(
      `Delete ${entry.groupName} with ${entry.teacherName} on ${weekDays[entry.dayOfWeek]}?`,
    );

    if (!shouldDelete) {
      return;
    }

    const result = await deleteTimetableEntry(entry.id);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage("Timetable entry deleted.");
    setError(null);
    await refreshTimetable();
  }

  function handleEditEntry(entry: TimetableEntry) {
    setEditingEntry(entry);
    setForm({
      dayOfWeek: entry.dayOfWeek,
      endTime: entry.endTime,
      groupId: entry.groupId,
      startTime: entry.startTime,
      teacherUserId: entry.teacherUserId,
    });
    setMessage(null);
    setError(null);
  }

  function handleNewEntryToggle() {
    setEditingEntry(null);
    setForm(emptyEntryForm);
    setIsCreateModalOpen(true);
  }

  function handleCancelForm() {
    setEditingEntry(null);
    setForm(emptyEntryForm);
    setIsCreateModalOpen(false);
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
              disabled={filteredEntries.length === 0}
              label="Export timetable"
              onClick={() => downloadTimetableEntries(filteredEntries)}
              text="Export"
            >
              <FileDownIcon />
            </IconButton>
            <IconButton
              label="Import timetable"
              onClick={() => setIsImportModalOpen(true)}
              text="Import CSV"
            >
              <FileUpIcon />
            </IconButton>
            <IconButton
              ariaExpanded={isCreateModalOpen}
              label="Add timetable entry"
              onClick={handleNewEntryToggle}
              text="New Entry"
              tone="primary"
            >
              <PlusIcon />
            </IconButton>
          </>
        }
      >
        {!isLoading && entries.length > 0 && (
          <p className="text-sm font-semibold text-text-muted">
            Showing {filteredEntries.length} of {entries.length} timetable entries.
          </p>
        )}
      </PanelToolbar>

      {areFiltersOpen && (
        <TimetableFilters
          filters={filters}
          groups={groups}
          onFiltersChange={setFilters}
          teachers={teachers}
        />
      )}

      {isCreateModalOpen && (
        <TimetableEntryModal
          form={form}
          groups={activeGroups}
          isSaving={isSaving}
          mode={editingEntry ? "edit" : "create"}
          onCancel={handleCancelForm}
          onChange={setForm}
          onSubmit={editingEntry ? handleUpdateEntry : handleCreateEntry}
          teachers={teachers}
        />
      )}

      {editingEntry && (
        <TimetableEntryModal
          form={form}
          groups={activeGroups}
          isSaving={isSaving}
          mode="edit"
          onCancel={handleCancelForm}
          onChange={setForm}
          onSubmit={handleUpdateEntry}
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
        {!isLoading && entries.length > 0 && filteredEntries.length === 0 && (
          <p className="text-sm text-text-muted">
            No timetable entries match these filters.
          </p>
        )}
        {!isLoading && filteredEntries.length > 0 && (
          <TimetableEntryTable
            entries={filteredEntries}
            onDeleteEntry={handleDeleteEntry}
            onEditEntry={handleEditEntry}
          />
        )}
      </div>
    </section>
  );
}

function TimetableEntryForm({
  form,
  groups,
  isSaving,
  mode,
  onCancel,
  onChange,
  onSubmit,
  teachers,
}: {
  form: CreateTimetableEntryInput;
  groups: GroupListItem[];
  isSaving: boolean;
  mode: "create" | "edit";
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
          {isSaving ? "Saving..." : mode === "edit" ? "Update" : "Save"}
        </button>
      </div>
    </form>
  );
}

function TimetableEntryModal({
  form,
  groups,
  isSaving,
  mode,
  onCancel,
  onChange,
  onSubmit,
  teachers,
}: {
  form: CreateTimetableEntryInput;
  groups: GroupListItem[];
  isSaving: boolean;
  mode: "create" | "edit";
  onCancel: () => void;
  onChange: (form: CreateTimetableEntryInput) => void;
  onSubmit: () => void;
  teachers: TimetableTeacher[];
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6">
      <div className="theme-panel motion-pop max-h-full w-full max-w-2xl overflow-y-auto p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">
              {mode === "edit" ? "Edit Timetable Entry" : "New Timetable Entry"}
            </h3>
          </div>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-button-border text-text-control transition hover:bg-surface-hover"
            onClick={onCancel}
            type="button"
          >
            <XIcon />
          </button>
        </div>
        <TimetableEntryForm
          form={form}
          groups={groups}
          isSaving={isSaving}
          mode={mode}
          onCancel={onCancel}
          onChange={onChange}
          onSubmit={onSubmit}
          teachers={teachers}
        />
      </div>
    </div>
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

function TimetableFilters({
  filters,
  groups,
  onFiltersChange,
  teachers,
}: {
  filters: TimetableFiltersState;
  groups: GroupListItem[];
  onFiltersChange: (filters: TimetableFiltersState) => void;
  teachers: TimetableTeacher[];
}) {
  function updateFilter<Field extends keyof TimetableFiltersState>(
    field: Field,
    value: TimetableFiltersState[Field],
  ) {
    onFiltersChange({ ...filters, [field]: value });
  }

  return (
    <div className="theme-subpanel mt-4 p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <SelectField
          label="Teacher"
          onChange={(value) => updateFilter("teacherUserId", value)}
          value={filters.teacherUserId}
        >
          <option value="">All teachers</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.displayName}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Group"
          onChange={(value) => updateFilter("groupId", value)}
          value={filters.groupId}
        >
          <option value="">All groups</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Day"
          onChange={(value) => updateFilter("dayOfWeek", value)}
          value={filters.dayOfWeek}
        >
          <option value="">All days</option>
          {weekDays.map((day, index) => (
            <option key={day} value={String(index)}>
              {day}
            </option>
          ))}
        </SelectField>
      </div>
    </div>
  );
}

function TimetableEntryTable({
  entries,
  onDeleteEntry,
  onEditEntry,
}: {
  entries: TimetableEntry[];
  onDeleteEntry: (entry: TimetableEntry) => void;
  onEditEntry: (entry: TimetableEntry) => void;
}) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {entries.map((entry) => (
          <TimetableEntryMobileRow
            entry={entry}
            key={entry.id}
            onDeleteEntry={onDeleteEntry}
            onEditEntry={onEditEntry}
          />
        ))}
      </div>

      <table className="hidden w-full border-collapse text-left text-sm md:table">
        <thead>
          <tr className="border-b border-border-subtle text-text-muted">
            <th className="py-2 pr-4 font-semibold">Group</th>
            <th className="py-2 pr-4 font-semibold">Teacher</th>
            <th className="py-2 pr-4 font-semibold">Day</th>
            <th className="py-2 pr-4 font-semibold">Time</th>
            <th className="py-2 pr-4 font-semibold">Status</th>
            <th className="py-2 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr className="border-b border-border-subtle" key={entry.id}>
              <td className="py-3 pr-4 font-semibold">{entry.groupName}</td>
              <td className="py-3 pr-4 text-text-muted">{entry.teacherName}</td>
              <td className="py-3 pr-4 text-text-muted">
                {weekDays[entry.dayOfWeek]}
              </td>
              <td className="py-3 pr-4 text-text-muted">
                {formatTimeRange(entry)}
              </td>
              <td className="py-3 pr-4">
                <TimetableStatusBadge isActive={entry.isActive} />
              </td>
              <td className="py-3">
                <TimetableActions
                  entry={entry}
                  onDeleteEntry={onDeleteEntry}
                  onEditEntry={onEditEntry}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function TimetableEntryMobileRow({
  entry,
  onDeleteEntry,
  onEditEntry,
}: {
  entry: TimetableEntry;
  onDeleteEntry: (entry: TimetableEntry) => void;
  onEditEntry: (entry: TimetableEntry) => void;
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
        <TimetableActions
          entry={entry}
          onDeleteEntry={onDeleteEntry}
          onEditEntry={onEditEntry}
        />
      </div>
      <div className="mt-3 grid gap-2 text-sm text-text-muted">
        <p>{weekDays[entry.dayOfWeek]}</p>
        <p>{formatTimeRange(entry)}</p>
        <TimetableStatusBadge isActive={entry.isActive} />
      </div>
    </article>
  );
}

function TimetableActions({
  entry,
  onDeleteEntry,
  onEditEntry,
}: {
  entry: TimetableEntry;
  onDeleteEntry: (entry: TimetableEntry) => void;
  onEditEntry: (entry: TimetableEntry) => void;
}) {
  return (
    <div className="flex gap-2">
      <IconButton label="Edit timetable entry" onClick={() => onEditEntry(entry)}>
        <PencilIcon />
      </IconButton>
      <IconButton
        label="Delete timetable entry"
        onClick={() => onDeleteEntry(entry)}
        tone="danger"
      >
        <TrashIcon />
      </IconButton>
    </div>
  );
}

function TimetableStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <StatusBadge
      label={isActive ? "Active" : "Archived"}
      tone={isActive ? "success" : "danger"}
    />
  );
}

function formatTimeRange(entry: TimetableEntry) {
  return `${entry.startTime} - ${entry.endTime}`;
}

function matchesTimetableFilters(
  entry: TimetableEntry,
  filters: TimetableFiltersState,
) {
  return (
    (!filters.teacherUserId || entry.teacherUserId === filters.teacherUserId) &&
    (!filters.groupId || entry.groupId === filters.groupId) &&
    (!filters.dayOfWeek || entry.dayOfWeek === Number(filters.dayOfWeek))
  );
}

function downloadTimetableEntries(entries: TimetableEntry[]) {
  downloadCsv(
    "timetable.csv",
    [
      "id",
      "teacher",
      "group",
      "day",
      "start_time",
      "end_time",
      "status",
    ],
    entries.map((entry) => [
      entry.id,
      entry.teacherName,
      entry.groupName,
      weekDays[entry.dayOfWeek],
      entry.startTime,
      entry.endTime,
      entry.isActive ? "active" : "archived",
    ]),
  );
}
