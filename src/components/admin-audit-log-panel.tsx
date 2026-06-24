"use client";

import { useEffect, useState } from "react";
import { listAuditLog } from "@/lib/actions";
import { formatDateTime } from "@/lib/formatters";
import type { AuditLogItem } from "@/services/audit-service";
import { IconButton } from "@/components/ui/icon-button";
import { EyeIcon, ListIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";

export function AdminAuditLogPanel() {
  const [entries, setEntries] = useState<AuditLogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
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

  return (
    <section className="theme-panel motion-panel mt-5 p-5">
      <PageHeader
        description="Administrative changes."
        icon={<ListIcon />}
        title="Audit Log"
      />

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
        {!isLoading && !error && entries.length > 0 && (
          <AuditLogList
            entries={entries}
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

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
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
                <td className="py-3 pr-4 text-text-muted">
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
