import { weekDays } from "@/components/admin-timetable/timetable-constants";
import { IconButton } from "@/components/ui/icon-button";
import { PencilIcon, TrashIcon } from "@/components/ui/icons";
import { StatusBadge } from "@/components/ui/status-badge";
import type { TimetableEntry } from "@/services/timetable-service";

export function TimetableEntryTable({
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

export function formatTimeRange(entry: TimetableEntry) {
  return `${entry.startTime} - ${entry.endTime}`;
}
