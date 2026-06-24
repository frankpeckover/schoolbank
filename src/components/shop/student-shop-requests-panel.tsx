"use client";

import { useEffect, useState } from "react";
import { listStudentShopRequests } from "@/lib/actions";
import type { StudentShopRequest } from "@/services/shop-service";
import { formatCurrencyAmount, formatDateTime } from "@/lib/formatters";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { ClockIcon, PackageIcon, ShoppingBagIcon } from "@/components/ui/icons";

type StudentShopRequestsPanelProps = {
  currencyName: string;
};

export function StudentShopRequestsPanel({
  currencyName,
}: StudentShopRequestsPanelProps) {
  const [requests, setRequests] = useState<StudentShopRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
      try {
        const loadedRequests = await listStudentShopRequests();

        if (isMounted) {
          setRequests(loadedRequests);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load shop requests.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRequests();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="theme-panel motion-panel mt-5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
          <ShoppingBagIcon />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">My Orders</h2>
          <p className="mt-1 text-sm text-text-muted">
            Pending and previous reward requests.
          </p>
        </div>
      </div>

      <div className="mt-4">
        {isLoading && (
          <p className="text-sm text-text-muted">Loading requests...</p>
        )}
        {error && (
          <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
            {error}
          </p>
        )}
        {!isLoading && !error && requests.length === 0 && (
          <p className="theme-subpanel px-3 py-4 text-sm text-text-muted">
            No orders yet.
          </p>
        )}
        {!isLoading && !error && requests.length > 0 && (
          <StudentRequestList currencyName={currencyName} requests={requests} />
        )}
      </div>
    </section>
  );
}

function StudentRequestList({
  currencyName,
  requests,
}: {
  currencyName: string;
  requests: StudentShopRequest[];
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {requests.map((request) => (
          <StudentRequestCard
            currencyName={currencyName}
            key={request.id}
            request={request}
          />
        ))}
    </div>
  );
}

function StudentRequestCard({
  currencyName,
  request,
}: {
  currencyName: string;
  request: StudentShopRequest;
}) {
  return (
    <article className="reward-shine rounded-md border border-border-subtle p-3 shadow-sm transition hover:border-brand-soft-strong hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface text-brand">
            <PackageIcon />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{request.itemName}</h3>
            <p className="text-xs text-text-muted">Reward order</p>
          </div>
        </div>
        <span className="text-sm font-semibold text-text-muted">
          {formatCurrencyAmount(request.price, currencyName)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StudentRequestStatusBadge request={request} />
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted">
          <ClockIcon className="h-3.5 w-3.5" />
          {formatDateTime(request.purchasedAt)}
        </span>
      </div>
      {request.decisionNote && (
        <p className="mt-2 text-sm text-text-muted">{request.decisionNote}</p>
      )}
    </article>
  );
}

function StudentRequestStatusBadge({
  request,
}: {
  request: StudentShopRequest;
}) {
  const label = getRequestStatusLabel(request);
  return (
    <StatusBadge label={label} tone={getRequestStatusTone(request)} />
  );
}

function getRequestStatusLabel(request: StudentShopRequest) {
  if (request.isVoided) {
    return "Voided";
  }

  if (request.status === "pending") {
    return "Pending";
  }

  if (request.status === "approved") {
    return "Approved";
  }

  return "Denied";
}

function getRequestStatusTone(request: StudentShopRequest): StatusTone {
  if (request.isVoided || request.status === "denied") {
    return "danger";
  }

  if (request.status === "pending") {
    return "warning";
  }

  return "success";
}
