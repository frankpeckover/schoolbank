"use client";

import { useEffect, useState } from "react";
import { listStudentShopRequests } from "@/lib/actions";
import type { SessionUser } from "@/lib/session";
import type { StudentShopRequest } from "@/services/shop-service";
import { formatCurrencyAmount, formatDateTime } from "@/lib/formatters";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";

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
        <h2 className="text-xl font-semibold">Shop Requests</h2>
        <p className="mt-1 text-sm text-text-muted">
          Your pending and previous reward requests.
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        {isLoading && (
          <p className="text-sm text-text-muted">Loading requests...</p>
        )}
        {error && (
          <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
            {error}
          </p>
        )}
        {!isLoading && !error && requests.length === 0 && (
          <p className="text-sm text-text-muted">No shop requests yet.</p>
        )}
        {!isLoading && !error && requests.length > 0 && (
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-text-muted">
                <th className="py-2 pr-4 font-semibold">Requested</th>
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
                  <td className="py-2 pr-4 font-semibold">
                    {request.itemName}
                  </td>
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
        )}
      </div>
    </section>
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
