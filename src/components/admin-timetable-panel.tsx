"use client";

import { useEffect, useMemo, useState } from "react";
import { TimetableEntryModal } from "@/components/admin-timetable/timetable-entry-modal";
import { TimetableEntryTable } from "@/components/admin-timetable/timetable-entry-table";
import { downloadTimetableEntries } from "@/components/admin-timetable/timetable-export";
import { TimetableImportModal } from "@/components/admin-timetable/timetable-import-modal";
import {
  defaultTimetableDayIndex,
  weekDays,
} from "@/components/admin-timetable/timetable-constants";
import {
  emptyTimetableFilters,
  type TimetableFiltersState,
} from "@/components/admin-timetable/timetable-types";
import { AdminPageSection } from "@/components/ui/admin-page-section";
import { FixedNotification } from "@/components/ui/fixed-notification";
import { IconButton } from "@/components/ui/icon-button";
import {
  FileDownIcon,
  FileUpIcon,
  PlusIcon,
} from "@/components/ui/icons";
import {
  ListPagination,
  usePagedList,
} from "@/components/ui/list-pagination";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import { TableToolbar } from "@/components/ui/table-toolbar";
import {
  createTimetableEntry,
  deleteTimetableEntry,
  listGroups,
  listTimetableEntries,
  listTimetableTeachers,
  updateTimetableEntry,
} from "@/lib/actions";
import type { GroupListItem } from "@/services/group-service";
import type {
  CreateTimetableEntryInput,
  TimetableEntry,
  TimetableTeacher,
} from "@/services/timetable-service";

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
  const [filters, setFilters] =
    useState<TimetableFiltersState>(emptyTimetableFilters);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
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
  const {
    page,
    pageItems: visibleEntries,
    setPage,
    totalPages,
  } = usePagedList(filteredEntries);

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

  function handleDuplicateEntry(entry: TimetableEntry) {
    setEditingEntry(null);
    setForm({
      dayOfWeek: entry.dayOfWeek,
      endTime: entry.endTime,
      groupId: entry.groupId,
      startTime: entry.startTime,
      teacherUserId: entry.teacherUserId,
    });
    setIsCreateModalOpen(true);
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
    <AdminPageSection isFlush>
      <FixedNotification error={error} message={message} />
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

      <div>
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
          <>
            <TimetableEntryTable
              entries={visibleEntries}
              filters={filters}
              groups={groups}
              onDeleteEntry={handleDeleteEntry}
              onDuplicateEntry={handleDuplicateEntry}
              onEditEntry={handleEditEntry}
              onFiltersChange={setFilters}
              teachers={teachers}
              toolbar={
                <TableToolbar
                  actions={
                    <>
                      <IconButton
                        ariaExpanded={isCreateModalOpen}
                        label="Add timetable entry"
                        onClick={handleNewEntryToggle}
                        text="New Entry"
                        tone="primary"
                      >
                        <PlusIcon />
                      </IconButton>
                      <TableActionMenu
                        label="Open timetable tools"
                        items={[
                          {
                            disabled: filteredEntries.length === 0,
                            icon: <FileDownIcon />,
                            label: "Export timetable: CSV",
                            onSelect: () =>
                              downloadTimetableEntries(filteredEntries),
                          },
                          {
                            icon: <FileUpIcon />,
                            label: "Import timetable: CSV",
                            onSelect: () => setIsImportModalOpen(true),
                          },
                        ]}
                      />
                    </>
                  }
                >
                  <p className="text-sm font-semibold text-text-muted">
                    Showing {visibleEntries.length} of {filteredEntries.length} timetable entries.
                  </p>
                </TableToolbar>
              }
            />
            <ListPagination
              onPageChange={setPage}
              page={page}
              totalCount={filteredEntries.length}
              totalPages={totalPages}
            />
          </>
        )}
      </div>
    </AdminPageSection>
  );
}

function matchesTimetableFilters(
  entry: TimetableEntry,
  filters: TimetableFiltersState,
) {
  return (
    (!filters.teacherUserId || entry.teacherUserId === filters.teacherUserId) &&
    (!filters.groupId || entry.groupId === filters.groupId) &&
    (!filters.dayOfWeek || entry.dayOfWeek === Number(filters.dayOfWeek)) &&
    (!filters.status ||
      (filters.status === "active" ? entry.isActive : !entry.isActive))
  );
}
