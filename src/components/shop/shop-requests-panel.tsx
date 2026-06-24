"use client";

import { useEffect, useState } from "react";
import {
  approveShopRequest,
  denyShopRequest,
  listStaffShopRequests,
} from "@/lib/actions";
import type { ShopPurchaseRequest } from "@/services/shop-service";
import { formatCurrencyAmount, formatDateTime } from "@/lib/formatters";
import { IconButton } from "@/components/ui/icon-button";
import { CheckIcon, ShoppingBagIcon, XIcon } from "@/components/ui/icons";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { TextReasonModal } from "@/components/ui/text-reason-modal";

type ShopRequestsPanelProps = {
  currencyName: string;
  onRequestActioned?: () => void;
};

export function ShopRequestsPanel({
  currencyName,
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
      const loadedRequests = await listStaffShopRequests();
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
        const loadedRequests = await listStaffShopRequests();

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

  async function handleApprove(purchaseId: string) {
    setError(null);
    setMessage(null);

    const result = await approveShopRequest(purchaseId);

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

    const result = await denyShopRequest(denyingRequestId, decisionNote);

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
    <section className="theme-panel mt-5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
            <ShoppingBagIcon />
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">Shop Requests</h3>
            <p className="mt-1 text-sm text-text-muted">
              Reserved reward orders.
            </p>
          </div>
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

      <div className="mt-4">
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
          <ShopRequestList
            currencyName={currencyName}
            onApprove={handleApprove}
            onDeny={setDenyingRequestId}
            requests={visibleRequests}
          />
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

function ShopRequestList({
  currencyName,
  onApprove,
  onDeny,
  requests,
}: {
  currencyName: string;
  onApprove: (purchaseId: string) => void;
  onDeny: (purchaseId: string) => void;
  requests: ShopPurchaseRequest[];
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {requests.map((request) => (
        <ShopRequestCard
          currencyName={currencyName}
          key={request.id}
          onApprove={onApprove}
          onDeny={onDeny}
          request={request}
        />
      ))}
    </div>
  );
}

function ShopRequestCard({
  currencyName,
  onApprove,
  onDeny,
  request,
}: {
  currencyName: string;
  onApprove: (purchaseId: string) => void;
  onDeny: (purchaseId: string) => void;
  request: ShopPurchaseRequest;
}) {
  return (
    <article className="theme-card p-3 transition hover:border-brand-soft-strong hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
            <ShoppingBagIcon />
          </span>
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold">{request.itemName}</h4>
            <p className="truncate text-sm text-text-muted">
              {request.studentName} ({request.studentUsername})
            </p>
          </div>
        </div>
        <ShopRequestActions
          onApprove={onApprove}
          onDeny={onDeny}
          request={request}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ShopRequestStatusBadge request={request} />
        <span className="text-sm font-semibold text-text-muted">
          {formatCurrencyAmount(request.price, currencyName)}
        </span>
      </div>
      <p className="mt-2 text-xs text-text-muted">
        {formatDateTime(request.purchasedAt)}
      </p>
      {request.decisionNote && (
        <p className="mt-2 text-sm text-text-muted">{request.decisionNote}</p>
      )}
    </article>
  );
}

function ShopRequestActions({
  onApprove,
  onDeny,
  request,
}: {
  onApprove: (purchaseId: string) => void;
  onDeny: (purchaseId: string) => void;
  request: ShopPurchaseRequest;
}) {
  if (request.status !== "pending") {
    return null;
  }

  return (
    <div className="flex gap-2">
      <IconButton
        label={`Approve ${request.itemName} for ${request.studentName}`}
        onClick={() => onApprove(request.id)}
        tone="primary"
      >
        <CheckIcon />
      </IconButton>
      <IconButton
        label={`Deny ${request.itemName} for ${request.studentName}`}
        onClick={() => onDeny(request.id)}
        tone="danger"
      >
        <XIcon />
      </IconButton>
    </div>
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
