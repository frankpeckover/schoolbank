"use client";

import { useEffect, useMemo, useState } from "react";
import { listAuditLog } from "@/lib/actions";
import { downloadCsv } from "@/lib/client-csv";
import { formatDateTime } from "@/lib/formatters";
import type { AuditLogItem } from "@/services/audit-service";
import { IconButton } from "@/components/ui/icon-button";
import { EyeIcon, FileDownIcon, FilterIcon, ListIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";

type AuditFilters = {
  action: string;
  actor: string;
  details: string;
  record: string;
};

const emptyAuditFilters: AuditFilters = {
  action: "",
  actor: "",
  details: "",
  record: "",
};
const visibleAuditLimit = 100;

export function AdminAuditLogPanel() {
  const [entries, setEntries] = useState<AuditLogItem[]>([]);
  const [filters, setFilters] = useState<AuditFilters>(emptyAuditFilters);
  const [error, setError] = useState<string | null>(null);
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingEntry, setViewingEntry] = useState<AuditLogItem | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAuditLog() {
      try {
        const loadedEntries = await listAuditLog();

        if (isMounted) {
          setEntries(loadedEntries);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load audit log.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAuditLog();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredEntries = useMemo(
    () => entries.filter((entry) => matchesAuditFilters(entry, filters)),
    [entries, filters],
  );
  const visibleEntries = filteredEntries.slice(0, visibleAuditLimit);

  return (
    <section className="theme-panel motion-panel mt-5 min-w-0 p-5">
      <PageHeader
        actions={
          <>
            <IconButton
              ariaExpanded={areFiltersOpen}
              label={areFiltersOpen ? "Hide filters" : "Show filters"}
              onClick={() => setAreFiltersOpen((isOpen) => !isOpen)}
            >
              <FilterIcon />
            </IconButton>
            <IconButton
              label="Export audit log"
              onClick={() => {
                if (isLoading || filteredEntries.length === 0) {
                  return;
                }

                downloadAuditLog(filteredEntries);
              }}
            >
              <FileDownIcon />
            </IconButton>
          </>
        }
        icon={<ListIcon />}
        iconTone="neutral"
        title="Audit Log"
      />

      {areFiltersOpen && (
        <AuditFilterPanel filters={filters} onFiltersChange={setFilters} />
      )}

      <div className="mt-5">
        {isLoading && (
          <p className="text-sm text-text-muted">Loading audit log...</p>
        )}
        {error && (
          <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
            {error}
          </p>
        )}
        {!isLoading && !error && entries.length === 0 && (
          <p className="text-sm text-text-muted">No audit events recorded yet.</p>
        )}
        {!isLoading && !error && entries.length > 0 && filteredEntries.length === 0 && (
          <p className="text-sm text-text-muted">
            No audit events match these filters.
          </p>
        )}
        {!isLoading && !error && filteredEntries.length > 0 && (
          <p className="mb-3 text-sm font-semibold text-text-muted">
            Showing {visibleEntries.length} of {filteredEntries.length} audit events.
          </p>
        )}
        {!isLoading && !error && filteredEntries.length > 0 && (
          <AuditLogList
            entries={visibleEntries}
            onDetailsClick={setViewingEntry}
          />
        )}
      </div>

      {viewingEntry && (
        <AuditLogDetailsModal
          entry={viewingEntry}
          onClose={() => setViewingEntry(null)}
        />
      )}
    </section>
  );
}

function AuditFilterPanel({
  filters,
  onFiltersChange,
}: {
  filters: AuditFilters;
  onFiltersChange: (filters: AuditFilters) => void;
}) {
  function updateFilter(field: keyof AuditFilters, value: string) {
    onFiltersChange({ ...filters, [field]: value });
  }

  return (
    <div className="theme-subpanel mt-4 grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-4">
      <AuditFilterInput
        label="Action"
        onChange={(value) => updateFilter("action", value)}
        value={filters.action}
      />
      <AuditFilterInput
        label="Actor"
        onChange={(value) => updateFilter("actor", value)}
        value={filters.actor}
      />
      <AuditFilterInput
        label="Record"
        onChange={(value) => updateFilter("record", value)}
        value={filters.record}
      />
      <AuditFilterInput
        label="Details"
        onChange={(value) => updateFilter("details", value)}
        value={filters.details}
      />
    </div>
  );
}

function AuditFilterInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-text-control">
        {label}
        <input
          className="mt-2 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none ring-brand transition focus:ring-2"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      </label>
    </div>
  );
}

function AuditLogList({
  entries,
  onDetailsClick,
}: {
  entries: AuditLogItem[];
  onDetailsClick: (entry: AuditLogItem) => void;
}) {
  return (
    <>
      <div className="grid gap-2 md:hidden">
        {entries.map((entry) => (
          <AuditLogMobileRow
            entry={entry}
            key={entry.id}
            onDetailsClick={onDetailsClick}
          />
        ))}
      </div>

      <div className="hidden w-full min-w-0 max-w-full overflow-x-auto md:block">
        <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-text-muted">
              <th className="py-2 pr-4 font-semibold">Time</th>
              <th className="py-2 pr-4 font-semibold">Action</th>
              <th className="py-2 pr-4 font-semibold">Actor</th>
              <th className="py-2 pr-4 font-semibold">Record</th>
              <th className="py-2 pr-4 font-semibold">Details</th>
              <th className="py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr className="border-b border-border-subtle" key={entry.id}>
                <td className="py-3 pr-4 text-text-muted">
                  {formatDateTime(entry.createdAt)}
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge
                    label={formatAction(entry.action)}
                    tone={getActionTone(entry.action)}
                  />
                </td>
                <td className="py-3 pr-4 text-text-muted">
                  {formatActor(entry)}
                </td>
                <td className="py-3 pr-4 text-text-muted">
                  {formatEntity(entry)}
                </td>
                <td className="break-words py-3 pr-4 text-text-muted">
                  {formatDetails(entry.details)}
                </td>
                <td className="py-3">
                  <IconButton
                    label="Audit event details"
                    onClick={() => onDetailsClick(entry)}
                  >
                    <EyeIcon />
                  </IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AuditLogMobileRow({
  entry,
  onDetailsClick,
}: {
  entry: AuditLogItem;
  onDetailsClick: (entry: AuditLogItem) => void;
}) {
  return (
    <article className="theme-card flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">
          {formatAction(entry.action)}
        </p>
        <p className="mt-1 truncate text-xs text-text-muted">
          {formatDateTime(entry.createdAt)}
        </p>
        <p className="mt-1 truncate text-sm text-text-muted">
          {formatActor(entry)}
        </p>
      </div>
      <IconButton
        label="Audit event details"
        onClick={() => onDetailsClick(entry)}
      >
        <EyeIcon />
      </IconButton>
    </article>
  );
}

function AuditLogDetailsModal({
  entry,
  onClose,
}: {
  entry: AuditLogItem;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6">
      <div className="theme-panel motion-pop max-h-full w-full max-w-2xl overflow-y-auto p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">Audit Details</h3>
            <p className="mt-1 text-sm text-text-muted">
              {formatDateTime(entry.createdAt)}
            </p>
          </div>
          <StatusBadge
            label={formatAction(entry.action)}
            tone={getActionTone(entry.action)}
          />
        </div>

        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <AuditDetail label="Action" value={formatAction(entry.action)} />
          <AuditDetail label="Actor" value={formatActor(entry)} />
          <AuditDetail label="Record" value={formatEntity(entry)} />
          <AuditDetail label="Details" value={formatDetails(entry.details)} />
        </dl>

        <div className="mt-5 flex justify-end">
          <button
            className="rounded-md border border-button-border px-4 py-2 text-sm font-semibold text-text-control transition hover:bg-surface-hover"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function AuditDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-text-muted">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-text-control">{value}</dd>
    </div>
  );
}

function formatActor(entry: AuditLogItem) {
  if (entry.actorName && entry.actorUsername) {
    return `${entry.actorName} (${entry.actorUsername})`;
  }

  return entry.actorName ?? entry.actorUsername ?? "System";
}

function formatAction(action: string) {
  return action
    .split(".")
    .map(formatEntityType)
    .join(" ");
}

function formatEntity(entry: AuditLogItem) {
  const entityType = formatEntityType(entry.entityType);

  if (!entry.entityId) {
    return entityType;
  }

  return `${entityType} ${entry.entityId}`;
}

function formatEntityType(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDetails(details: Record<string, unknown>) {
  const visibleEntries = Object.entries(details).filter(([, value]) =>
    isSimpleDetail(value),
  );

  if (visibleEntries.length === 0) {
    return "-";
  }

  return visibleEntries
    .slice(0, 3)
    .map(([key, value]) => `${formatEntityType(key)}: ${String(value)}`)
    .join(", ");
}

function isSimpleDetail(value: unknown) {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function getActionTone(action: string): StatusTone {
  if (
    action.includes("denied") ||
    action.includes("disabled") ||
    action.includes("removed") ||
    action.includes("voided")
  ) {
    return "danger";
  }

  if (
    action.includes("approved") ||
    action.includes("created") ||
    action.includes("enabled")
  ) {
    return "success";
  }

  if (action.includes("updated") || action.includes("changed")) {
    return "warning";
  }

  return "neutral";
}

function matchesAuditFilters(entry: AuditLogItem, filters: AuditFilters) {
  return (
    includesFilter(formatAction(entry.action), filters.action) &&
    includesFilter(formatActor(entry), filters.actor) &&
    includesFilter(formatEntity(entry), filters.record) &&
    includesFilter(formatDetails(entry.details), filters.details)
  );
}

function includesFilter(value: string, filter: string) {
  return value.toLowerCase().includes(filter.trim().toLowerCase());
}

function downloadAuditLog(entries: AuditLogItem[]) {
  downloadCsv(
    "audit-log.csv",
    ["time", "action", "actor", "record", "details"],
    entries.map((entry) => [
      formatDateTime(entry.createdAt),
      formatAction(entry.action),
      formatActor(entry),
      formatEntity(entry),
      formatDetails(entry.details),
    ]),
  );
}
