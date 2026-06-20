"use client";

import { useEffect, useState } from "react";
import { listAuditLog } from "@/lib/actions";
import { formatDateTime } from "@/lib/formatters";
import type { SessionUser } from "@/lib/session";
import type { AuditLogItem } from "@/services/audit-service";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";

type AdminAuditLogPanelProps = {
  currentUser: SessionUser;
};

export function AdminAuditLogPanel({
  currentUser,
}: AdminAuditLogPanelProps) {
  const [entries, setEntries] = useState<AuditLogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadAuditLog() {
      try {
        const loadedEntries = await listAuditLog(currentUser);

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
  }, [currentUser]);

  return (
    <section className="motion-panel mt-5 rounded-md border border-border bg-surface p-5 shadow-sm">
      <PageHeader
        description="Recent administrative and system changes."
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
          <AuditLogList entries={entries} />
        )}
      </div>
    </section>
  );
}

function AuditLogList({ entries }: { entries: AuditLogItem[] }) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {entries.map((entry) => (
          <AuditLogCard entry={entry} key={entry.id} />
        ))}
      </div>

      <table className="hidden w-full border-collapse text-left text-sm md:table">
        <thead>
          <tr className="border-b border-border-subtle text-text-muted">
            <th className="py-2 pr-4 font-semibold">Time</th>
            <th className="py-2 pr-4 font-semibold">Action</th>
            <th className="py-2 pr-4 font-semibold">Actor</th>
            <th className="py-2 pr-4 font-semibold">Record</th>
            <th className="py-2 font-semibold">Details</th>
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
              <td className="py-3 text-text-muted">
                {formatDetails(entry.details)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function AuditLogCard({ entry }: { entry: AuditLogItem }) {
  return (
    <article className="rounded-md border border-border-subtle bg-panel-soft p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">
            {formatAction(entry.action)}
          </h3>
          <p className="text-xs text-text-muted">
            {formatDateTime(entry.createdAt)}
          </p>
        </div>
        <StatusBadge
          label={formatEntityType(entry.entityType)}
          tone={getActionTone(entry.action)}
        />
      </div>
      <p className="mt-3 text-sm text-text-muted">{formatActor(entry)}</p>
      <p className="mt-1 truncate text-sm text-text-muted">
        {formatEntity(entry)}
      </p>
      <p className="mt-2 text-sm text-text-muted">
        {formatDetails(entry.details)}
      </p>
    </article>
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
