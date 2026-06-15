"use client";

import { useEffect, useState } from "react";
import {
  approveShopRequest,
  denyShopRequest,
  listStaffShopRequests,
} from "@/lib/actions";
import type { SessionUser } from "@/lib/session";
import type { ShopPurchaseRequest } from "@/services/shop-service";
import { formatCurrencyAmount, formatDateTime } from "@/lib/formatters";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { TextReasonModal } from "@/components/ui/text-reason-modal";

type ShopRequestsPanelProps = {
  currencyName: string;
  currentUser: SessionUser;
  onRequestActioned?: () => void;
};

export function ShopRequestsPanel({
  currencyName,
  currentUser,
  onRequestActioned,
}: ShopRequestsPanelProps) {
  const [requests, setRequests] = useState<ShopPurchaseRequest[]>([]);
  const [activeView, setActiveView] = useState<"pending" | "recent">("pending");
  const [denyingRequestId, setDenyingRequestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refreshRequests() {
    setIsLoading(true);

    try {
      const loadedRequests = await listStaffShopRequests(currentUser);
      setRequests(loadedRequests);
      setError(null);
    } catch {
      setError("Could not load shop requests.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
      try {
        const loadedRequests = await listStaffShopRequests(currentUser);

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

  async function handleApprove(purchaseId: string) {
    setError(null);
    setMessage(null);

    const result = await approveShopRequest(currentUser, purchaseId);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage("Request approved.");
    onRequestActioned?.();
    refreshRequests();
  }

  async function handleDeny(decisionNote: string) {
    if (!denyingRequestId) {
      return;
    }
    setError(null);
    setMessage(null);

    const result = await denyShopRequest(
      currentUser,
      denyingRequestId,
      decisionNote,
    );

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setDenyingRequestId(null);
    setMessage("Request denied.");
    onRequestActioned?.();
    refreshRequests();
  }

  const visibleRequests =
    activeView === "pending"
      ? requests.filter((request) => request.status === "pending")
      : requests.filter((request) => request.status !== "pending");

  return (
    <section className="mt-5 rounded-md border border-border-subtle bg-panel-soft p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Shop Requests</h3>
          <p className="mt-1 text-sm text-text-muted">
            Review reserved shop purchases before students receive rewards.
          </p>
        </div>
        <div className="flex rounded-md border border-border bg-surface p-1">
          {(["pending", "recent"] as const).map((view) => (
            <button
              className={`rounded-sm px-3 py-1.5 text-sm font-semibold ${
                activeView === view
                  ? "bg-brand text-white"
                  : "text-text-control hover:bg-surface-hover"
              }`}
              key={view}
              onClick={() => setActiveView(view)}
              type="button"
            >
              {view === "pending" ? "Pending" : "Recent"}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <p className="mt-4 rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-semibold text-success">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
          {error}
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        {isLoading && (
          <p className="text-sm text-text-muted">Loading requests...</p>
        )}
        {!isLoading && visibleRequests.length === 0 && (
          <p className="text-sm text-text-muted">
            {activeView === "pending"
              ? "No pending requests."
              : "No recent requests."}
          </p>
        )}
        {!isLoading && visibleRequests.length > 0 && (
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-text-muted">
                <th className="py-2 pr-4 font-semibold">Requested</th>
                <th className="py-2 pr-4 font-semibold">Student</th>
                <th className="py-2 pr-4 font-semibold">Item</th>
                <th className="py-2 pr-4 font-semibold">Status</th>
                <th className="py-2 pr-4 text-right font-semibold">Cost</th>
                <th className="py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRequests.map((request) => (
                <tr className="border-b border-border-subtle" key={request.id}>
                  <td className="py-2 pr-4 text-text-muted">
                    {formatDateTime(request.purchasedAt)}
                  </td>
                  <td className="py-2 pr-4 text-text-muted">
                    {request.studentName}
                    <span className="block text-xs">
                      {request.studentUsername}
                    </span>
                  </td>
                  <td className="py-2 pr-4 font-semibold">
                    {request.itemName}
                    {request.decisionNote && (
                      <span className="block text-xs font-normal text-text-muted">
                        {request.decisionNote}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <ShopRequestStatusBadge request={request} />
                  </td>
                  <td className="py-2 pr-4 text-right text-text-muted">
                    {formatCurrencyAmount(request.price, currencyName)}
                  </td>
                  <td className="py-2">
                    {request.status === "pending" && (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          className="rounded-md bg-success px-3 py-2 text-sm font-semibold text-white transition hover:bg-success-hover"
                          onClick={() => handleApprove(request.id)}
                          type="button"
                        >
                          Approve
                        </button>
                        <button
                          className="rounded-md border border-danger-button-border px-3 py-2 text-sm font-semibold text-danger-strong transition hover:bg-danger-soft"
                          onClick={() => setDenyingRequestId(request.id)}
                          type="button"
                        >
                          Deny
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {denyingRequestId && (
        <TextReasonModal
          confirmLabel="Deny Request"
          description="The reserved balance and stock will be released."
          isRequired
          onCancel={() => setDenyingRequestId(null)}
          onConfirm={handleDeny}
          title="Deny Shop Request"
        />
      )}
    </section>
  );
}

function ShopRequestStatusBadge({
  request,
}: {
  request: ShopPurchaseRequest;
}) {
  return (
    <StatusBadge
      label={getShopRequestStatusLabel(request)}
      tone={getShopRequestStatusTone(request)}
    />
  );
}

function getShopRequestStatusLabel(request: ShopPurchaseRequest) {
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

function getShopRequestStatusTone(request: ShopPurchaseRequest): StatusTone {
  if (request.isVoided || request.status === "denied") {
    return "danger";
  }

  if (request.status === "pending") {
    return "warning";
  }

  return "success";
}
