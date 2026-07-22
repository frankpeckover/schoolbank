import type { ReactNode } from "react";
import { weekDays } from "@/components/admin-timetable/timetable-constants";
import { CopyIcon, PencilIcon, TrashIcon } from "@/components/ui/icons";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import {
  TableHeaderFilter,
  TableHeaderFilterSelect,
} from "@/components/ui/table-header-filter";
import type { TimetableFiltersState } from "@/components/admin-timetable/timetable-types";
import type { GroupListItem } from "@/services/group-service";
import type { TimetableEntry } from "@/services/timetable-service";
import type { TimetableTeacher } from "@/services/timetable-service";

export function TimetableEntryTable({
  entries,
  filters,
  groups,
  onDeleteEntry,
  onDuplicateEntry,
  onEditEntry,
  onFiltersChange,
  teachers,
  toolbar,
}: {
  entries: TimetableEntry[];
  filters: TimetableFiltersState;
  groups: GroupListItem[];
  onDeleteEntry: (entry: TimetableEntry) => void;
  onDuplicateEntry: (entry: TimetableEntry) => void;
  onEditEntry: (entry: TimetableEntry) => void;
  onFiltersChange: (filters: TimetableFiltersState) => void;
  teachers: TimetableTeacher[];
  toolbar?: ReactNode;
}) {
  function updateFilter<Field extends keyof TimetableFiltersState>(
    field: Field,
    value: TimetableFiltersState[Field],
  ) {
    onFiltersChange({ ...filters, [field]: value });
  }

  return (
    <>
      {toolbar && <div className="mb-3 md:hidden">{toolbar}</div>}
      <div className="grid gap-3 md:hidden">
        {entries.map((entry) => (
          <TimetableEntryMobileRow
            entry={entry}
            key={entry.id}
            onDeleteEntry={onDeleteEntry}
            onDuplicateEntry={onDuplicateEntry}
            onEditEntry={onEditEntry}
          />
        ))}
      </div>

      {toolbar && <div className="hidden md:block">{toolbar}</div>}
      <table className="hidden w-full table-fixed border-collapse text-left text-sm md:table">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[28%]" />
          <col className="w-[14%]" />
          <col className="w-[16%]" />
          <col className="w-[8%]" />
          <col className="w-12" />
        </colgroup>
        <thead>
          <tr className="border-b border-border-subtle text-text-muted">
            <th className="py-2 pr-4 font-semibold">
              <TableHeaderFilter
                isActive={Boolean(filters.groupId)}
                label="Group"
                onClear={() => updateFilter("groupId", "")}
              >
                <TableHeaderFilterSelect
                  label="Group"
                  onChange={(value) => updateFilter("groupId", value)}
                  options={[
                    { label: "All groups", value: "" },
                    ...groups.map((group) => ({
                      label: group.name,
                      value: group.id,
                    })),
                  ]}
                  value={filters.groupId}
                />
              </TableHeaderFilter>
            </th>
            <th className="py-2 pr-4 font-semibold">
              <TableHeaderFilter
                isActive={Boolean(filters.teacherUserId)}
                label="Teacher"
                onClear={() => updateFilter("teacherUserId", "")}
              >
                <TableHeaderFilterSelect
                  label="Teacher"
                  onChange={(value) => updateFilter("teacherUserId", value)}
                  options={[
                    { label: "All teachers", value: "" },
                    ...teachers.map((teacher) => ({
                      label: teacher.displayName,
                      value: teacher.id,
                    })),
                  ]}
                  value={filters.teacherUserId}
                />
              </TableHeaderFilter>
            </th>
            <th className="py-2 pr-4 font-semibold">
              <TableHeaderFilter
                isActive={Boolean(filters.dayOfWeek)}
                label="Day"
                onClear={() => updateFilter("dayOfWeek", "")}
              >
                <TableHeaderFilterSelect
                  label="Day"
                  onChange={(value) => updateFilter("dayOfWeek", value)}
                  options={[
                    { label: "All days", value: "" },
                    ...weekDays.map((day, index) => ({
                      label: day,
                      value: String(index),
                    })),
                  ]}
                  value={filters.dayOfWeek}
                />
              </TableHeaderFilter>
            </th>
            <th className="py-2 pr-4 font-semibold">Time</th>
            <th className="py-2 pr-4 font-semibold">
              <TableHeaderFilter
                isActive={Boolean(filters.status)}
                label="Status"
                onClear={() => updateFilter("status", "")}
              >
                <TableHeaderFilterSelect
                  label="Status"
                  onChange={(value) =>
                    updateFilter("status", value as TimetableFiltersState["status"])
                  }
                  options={[
                    { label: "Any status", value: "" },
                    { label: "Active", value: "active" },
                    { label: "Archived", value: "archived" },
                  ]}
                  value={filters.status}
                />
              </TableHeaderFilter>
            </th>
            <th className="py-2 text-right font-semibold">
              <span className="sr-only">Actions</span>
            </th>
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
              <td className="py-3 text-right">
                <TimetableActions
                  entry={entry}
                  onDeleteEntry={onDeleteEntry}
                  onDuplicateEntry={onDuplicateEntry}
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
  onDuplicateEntry,
  onEditEntry,
}: {
  entry: TimetableEntry;
  onDeleteEntry: (entry: TimetableEntry) => void;
  onDuplicateEntry: (entry: TimetableEntry) => void;
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
          onDuplicateEntry={onDuplicateEntry}
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
  onDuplicateEntry,
  onEditEntry,
}: {
  entry: TimetableEntry;
  onDeleteEntry: (entry: TimetableEntry) => void;
  onDuplicateEntry: (entry: TimetableEntry) => void;
  onEditEntry: (entry: TimetableEntry) => void;
}) {
  return (
    <TableActionMenu
      label={`Open actions for ${entry.groupName}`}
      items={[
        {
          icon: <PencilIcon />,
          label: "Edit",
          onSelect: () => onEditEntry(entry),
        },
        {
          icon: <CopyIcon />,
          label: "Duplicate",
          onSelect: () => onDuplicateEntry(entry),
        },
        {
          icon: <TrashIcon />,
          label: "Delete",
          onSelect: () => onDeleteEntry(entry),
          tone: "danger",
        },
      ]}
    />
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

export function formatTimeRange(entry: TimetableEntry) {
  return `${entry.startTime} - ${entry.endTime}`;
}
