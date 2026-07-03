"use client";

import { useEffect, useState } from "react";
import { listErrorLog } from "@/lib/actions";
import { formatDateTime } from "@/lib/formatters";
import type { ErrorLogItem } from "@/services/error-log-service";
import { IconButton } from "@/components/ui/icon-button";
import { EyeIcon } from "@/components/ui/icons";
import { PanelToolbar } from "@/components/ui/panel-toolbar";

export function AdminErrorLogPanel() {
  const [entries, setEntries] = useState<ErrorLogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingEntry, setViewingEntry] = useState<ErrorLogItem | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadErrorLog() {
      try {
        const loadedEntries = await listErrorLog();

        if (isMounted) {
          setEntries(loadedEntries);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load error log.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadErrorLog();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="theme-panel motion-panel mt-5 min-w-0 p-5">
      {!isLoading && !error && entries.length > 0 && (
        <PanelToolbar>
          <p className="text-sm font-semibold text-text-muted">
            Showing {entries.length} most recent errors.
          </p>
        </PanelToolbar>
      )}

      <div className={!isLoading && !error && entries.length > 0 ? "mt-5" : ""}>
        {isLoading && (
          <p className="text-sm text-text-muted">Loading error log...</p>
        )}
        {error && (
          <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
            {error}
          </p>
        )}
        {!isLoading && !error && entries.length === 0 && (
          <p className="text-sm text-text-muted">No server errors recorded.</p>
        )}
        {!isLoading && !error && entries.length > 0 && (
          <ErrorLogList entries={entries} onDetailsClick={setViewingEntry} />
        )}
      </div>

      {viewingEntry && (
        <ErrorLogDetailsModal
          entry={viewingEntry}
          onClose={() => setViewingEntry(null)}
        />
      )}
    </section>
  );
}

function ErrorLogList({
  entries,
  onDetailsClick,
}: {
  entries: ErrorLogItem[];
  onDetailsClick: (entry: ErrorLogItem) => void;
}) {
  return (
    <>
      <div className="grid w-full min-w-0 gap-2 md:hidden">
        {entries.map((entry) => (
          <ErrorLogMobileRow
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
              <th className="py-2 pr-4 font-semibold">Source</th>
              <th className="py-2 pr-4 font-semibold">Message</th>
              <th className="py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr className="border-b border-border-subtle" key={entry.id}>
                <td className="py-3 pr-4 text-text-muted">
                  {formatDateTime(entry.createdAt)}
                </td>
                <td className="max-w-64 break-words py-3 pr-4 font-semibold">
                  {entry.source}
                </td>
                <td className="max-w-96 break-words py-3 pr-4 text-text-muted">
                  {entry.message}
                </td>
                <td className="py-3">
                  <IconButton
                    label="Error details"
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

function ErrorLogMobileRow({
  entry,
  onDetailsClick,
}: {
  entry: ErrorLogItem;
  onDetailsClick: (entry: ErrorLogItem) => void;
}) {
  return (
    <article className="theme-card flex w-full min-w-0 items-center justify-between gap-3 overflow-hidden p-3">
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="break-all text-sm font-semibold">{entry.source}</p>
        <p className="mt-1 truncate text-xs text-text-muted">
          {formatDateTime(entry.createdAt)}
        </p>
        <p className="mt-1 break-words text-sm text-text-muted">
          {entry.message}
        </p>
      </div>
      <div className="shrink-0">
        <IconButton label="Error details" onClick={() => onDetailsClick(entry)}>
          <EyeIcon />
        </IconButton>
      </div>
    </article>
  );
}

function ErrorLogDetailsModal({
  entry,
  onClose,
}: {
  entry: ErrorLogItem;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6">
      <div className="theme-panel motion-pop max-h-full w-full max-w-3xl overflow-y-auto p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold">Error Details</h3>
            <p className="mt-1 text-sm text-text-muted">
              {formatDateTime(entry.createdAt)}
            </p>
          </div>
          <button
            className="rounded-md border border-button-border px-4 py-2 text-sm font-semibold text-text-control transition hover:bg-surface-hover"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <ErrorDetail label="Source" value={entry.source} />
          <ErrorDetail label="Message" value={entry.message} />
        </dl>

        <ErrorCodeBlock label="Context" value={JSON.stringify(entry.context, null, 2)} />
        {entry.stack && <ErrorCodeBlock label="Stack" value={entry.stack} />}
      </div>
    </div>
  );
}

function ErrorDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-text-muted">
        {label}
      </dt>
      <dd className="mt-1 break-words font-semibold text-text-control">
        {value}
      </dd>
    </div>
  );
}

function ErrorCodeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-5">
      <p className="text-xs font-semibold uppercase text-text-muted">{label}</p>
      <pre className="mt-2 max-h-80 overflow-auto rounded-md border border-border-subtle bg-panel-soft p-3 text-xs text-text-control">
        {value}
      </pre>
    </div>
  );
}
