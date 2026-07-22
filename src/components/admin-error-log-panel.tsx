"use client";

import { useEffect, useMemo, useState } from "react";
import { listErrorLog } from "@/lib/actions";
import { formatDateTime } from "@/lib/formatters";
import type { ErrorLogItem } from "@/services/error-log-service";
import { AdminPageSection } from "@/components/ui/admin-page-section";
import { IconButton } from "@/components/ui/icon-button";
import { EyeIcon } from "@/components/ui/icons";
import {
  ListPagination,
  usePagedList,
} from "@/components/ui/list-pagination";
import { ModalShell } from "@/components/ui/modal-shell";
import { PanelToolbar } from "@/components/ui/panel-toolbar";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import {
  TableHeaderFilter,
  TableHeaderFilterInput,
} from "@/components/ui/table-header-filter";

type ErrorFilters = {
  message: string;
  source: string;
};

const emptyErrorFilters: ErrorFilters = {
  message: "",
  source: "",
};

export function AdminErrorLogPanel() {
  const [entries, setEntries] = useState<ErrorLogItem[]>([]);
  const [filters, setFilters] = useState<ErrorFilters>(emptyErrorFilters);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingEntry, setViewingEntry] = useState<ErrorLogItem | null>(null);
  const filteredEntries = useMemo(
    () => entries.filter((entry) => matchesErrorFilters(entry, filters)),
    [entries, filters],
  );
  const {
    page,
    pageItems: visibleEntries,
    setPage,
    totalPages,
  } = usePagedList(filteredEntries);

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
    <AdminPageSection>
      {!isLoading && !error && filteredEntries.length > 0 && (
        <PanelToolbar>
          <p className="text-sm font-semibold text-text-muted">
            Showing {visibleEntries.length} of {filteredEntries.length} errors.
          </p>
        </PanelToolbar>
      )}

      <div className={!isLoading && !error && filteredEntries.length > 0 ? "mt-5" : ""}>
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
        {!isLoading && !error && entries.length > 0 && filteredEntries.length === 0 && (
          <p className="text-sm text-text-muted">
            No server errors match these filters.
          </p>
        )}
        {!isLoading && !error && filteredEntries.length > 0 && (
          <>
            <ErrorLogList
              entries={visibleEntries}
              filters={filters}
              onDetailsClick={setViewingEntry}
              onFiltersChange={setFilters}
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

      {viewingEntry && (
        <ErrorLogDetailsModal
          entry={viewingEntry}
          onClose={() => setViewingEntry(null)}
        />
      )}
    </AdminPageSection>
  );
}

function ErrorLogList({
  entries,
  filters,
  onDetailsClick,
  onFiltersChange,
}: {
  entries: ErrorLogItem[];
  filters: ErrorFilters;
  onDetailsClick: (entry: ErrorLogItem) => void;
  onFiltersChange: (filters: ErrorFilters) => void;
}) {
  function updateFilter(field: keyof ErrorFilters, value: string) {
    onFiltersChange({ ...filters, [field]: value });
  }

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
              <th className="py-2 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.source)}
                  label="Source"
                  onClear={() => updateFilter("source", "")}
                >
                  <TableHeaderFilterInput
                    label="Source"
                    onChange={(value) => updateFilter("source", value)}
                    value={filters.source}
                  />
                </TableHeaderFilter>
              </th>
              <th className="py-2 pr-4 font-semibold">
                <TableHeaderFilter
                  isActive={Boolean(filters.message)}
                  label="Message"
                  onClear={() => updateFilter("message", "")}
                >
                  <TableHeaderFilterInput
                    label="Message"
                    onChange={(value) => updateFilter("message", value)}
                    value={filters.message}
                  />
                </TableHeaderFilter>
              </th>
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
                  <TableActionMenu
                    label="Open error actions"
                    items={[
                      {
                        icon: <EyeIcon />,
                        label: "View details",
                        onSelect: () => onDetailsClick(entry),
                      },
                    ]}
                  />
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
    <ModalShell
      description={formatDateTime(entry.createdAt)}
      maxWidthClassName="max-w-3xl"
      onClose={onClose}
      title="Error Details"
    >
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <ErrorDetail label="Source" value={entry.source} />
        <ErrorDetail label="Message" value={entry.message} />
      </dl>

      <ErrorCodeBlock label="Context" value={JSON.stringify(entry.context, null, 2)} />
      {entry.stack && <ErrorCodeBlock label="Stack" value={entry.stack} />}
    </ModalShell>
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

function matchesErrorFilters(entry: ErrorLogItem, filters: ErrorFilters) {
  return (
    includesFilter(entry.source, filters.source) &&
    includesFilter(entry.message, filters.message)
  );
}

function includesFilter(value: string, filter: string) {
  return value.toLowerCase().includes(filter.trim().toLowerCase());
}
