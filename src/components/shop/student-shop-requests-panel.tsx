"use client";

import { useEffect, useState } from "react";
import { listStudentShopRequests } from "@/lib/actions";
import type { SessionUser } from "@/lib/session";
import type { StudentShopRequest } from "@/services/shop-service";
import { formatCurrencyAmount, formatDateTime } from "@/lib/formatters";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { PackageIcon } from "@/components/ui/icons";

type StudentShopRequestsPanelProps = {
  currencyName: string;
  currentUser: SessionUser;
};

export function StudentShopRequestsPanel({
  currencyName,
  currentUser,
}: StudentShopRequestsPanelProps) {
  const [requests, setRequests] = useState<StudentShopRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
      try {
        const loadedRequests = await listStudentShopRequests(currentUser);

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
  }, [currentUser]);

  return (
    <section className="mt-5 rounded-md border border-border bg-surface p-4 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">My Orders</h2>
        <p className="mt-1 text-sm text-text-muted">
          Your pending and previous reward orders.
        </p>
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
          <p className="text-sm text-text-muted">No orders yet.</p>
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
    <>
      <div className="grid gap-3 md:hidden">
        {requests.map((request) => (
          <StudentRequestCard
            currencyName={currencyName}
            key={request.id}
            request={request}
          />
        ))}
      </div>

      <table className="hidden w-full border-collapse text-left text-sm md:table">
        <thead>
          <tr className="border-b border-border-subtle text-text-muted">
            <th className="py-2 pr-4 font-semibold">Ordered</th>
            <th className="py-2 pr-4 font-semibold">Item</th>
            <th className="py-2 pr-4 text-right font-semibold">Cost</th>
            <th className="py-2 pr-4 font-semibold">Status</th>
            <th className="py-2 font-semibold">Note</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr className="border-b border-border-subtle" key={request.id}>
              <td className="py-2 pr-4 text-text-muted">
                {formatDateTime(request.purchasedAt)}
              </td>
              <td className="py-2 pr-4 font-semibold">{request.itemName}</td>
              <td className="py-2 pr-4 text-right text-text-muted">
                {formatCurrencyAmount(request.price, currencyName)}
              </td>
              <td className="py-2 pr-4">
                <StudentRequestStatusBadge request={request} />
              </td>
              <td className="py-2 text-text-muted">
                {request.decisionNote || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
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
    <article className="rounded-md border border-border-subtle bg-panel-soft p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface text-text-muted">
            <PackageIcon />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{request.itemName}</h3>
            <p className="text-xs text-text-muted">
              {formatDateTime(request.purchasedAt)}
            </p>
          </div>
        </div>
        <span className="text-sm font-semibold text-text-muted">
          {formatCurrencyAmount(request.price, currencyName)}
        </span>
      </div>
      <div className="mt-3">
        <StudentRequestStatusBadge request={request} />
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
