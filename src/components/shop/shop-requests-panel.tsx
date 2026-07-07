"use client";

import { useEffect, useState } from "react";
import {
  approveShopRequest,
  denyShopRequest,
  listStaffShopRequests,
} from "@/lib/actions";
import type { ShopPurchaseRequest } from "@/services/shop-service";
import { formatAmount, formatDateTime } from "@/lib/formatters";
import { IconButton } from "@/components/ui/icon-button";
import { CheckIcon, ShoppingBagIcon, XIcon } from "@/components/ui/icons";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { TextReasonModal } from "@/components/ui/text-reason-modal";

type ShopRequestsPanelProps = {
  className?: string;
  compact?: boolean;
  currencyName: string;
  maxVisibleRequests?: number;
  onRequestActioned?: () => void;
  showViewToggle?: boolean;
  title?: string;
};

export function ShopRequestsPanel({
  className = "mt-5",
  compact = false,
  maxVisibleRequests,
  onRequestActioned,
  showViewToggle = true,
  title = "Shop Requests",
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

  const filteredRequests =
    activeView === "pending"
      ? requests.filter((request) => request.status === "pending")
      : requests.filter((request) => request.status !== "pending");
  const visibleRequests =
    maxVisibleRequests === undefined
      ? filteredRequests
      : filteredRequests.slice(0, maxVisibleRequests);
  const pendingRequestCount = requests.filter(
    (request) => request.status === "pending",
  ).length;

  return (
    <section
      className={`${
        compact
          ? "wallet-card rounded-3xl border border-brand-soft-strong shadow-sm"
          : "theme-panel"
      } motion-panel p-4 ${className}`}
    >
      <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-panel-soft text-text-muted">
            <ShoppingBagIcon />
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">{title}</h3>
            {!compact && (
              <p className="mt-2 inline-flex rounded-md bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
                {pendingRequestCount} pending
              </p>
            )}
          </div>
        </div>
        {showViewToggle && (
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
        )}
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

      <div className="relative z-10 mt-4">
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
            compact={compact}
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
  compact,
  onApprove,
  onDeny,
  requests,
}: {
  compact: boolean;
  onApprove: (purchaseId: string) => void;
  onDeny: (purchaseId: string) => void;
  requests: ShopPurchaseRequest[];
}) {
  if (compact) {
    return (
      <CompactShopRequestList
        onApprove={onApprove}
        onDeny={onDeny}
        requests={requests}
      />
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {requests.map((request) => (
        <ShopRequestCard
          key={request.id}
          onApprove={onApprove}
          onDeny={onDeny}
          request={request}
        />
      ))}
    </div>
  );
}

function CompactShopRequestList({
  onApprove,
  onDeny,
  requests,
}: {
  onApprove: (purchaseId: string) => void;
  onDeny: (purchaseId: string) => void;
  requests: ShopPurchaseRequest[];
}) {
  return (
    <>
      <div className="grid gap-2 md:hidden">
        {requests.map((request) => (
          <CompactShopRequestMobileRow
            key={request.id}
            onApprove={onApprove}
            onDeny={onDeny}
            request={request}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[34%]" />
            <col className="w-[26%]" />
            <col className="w-[16%]" />
            <col className="w-[14%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border-subtle text-text-muted">
              <th className="py-2 pr-4 font-semibold">Request</th>
              <th className="py-2 pr-4 font-semibold">Student</th>
              <th className="py-2 pr-4 font-semibold">Cost</th>
              <th className="py-2 pr-4 font-semibold">Status</th>
              <th className="py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr className="border-b border-border-subtle" key={request.id}>
                <td className="py-2 pr-4">
                  <p className="truncate text-sm font-semibold text-text-control">
                    {request.itemName}
                  </p>
                  <p className="mt-1 truncate text-xs text-text-muted">
                    {formatDateTime(request.purchasedAt)}
                  </p>
                </td>
                <td className="py-2 pr-4">
                  <p className="truncate text-sm font-semibold text-text-control">
                    {request.studentName}
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {request.studentUsername}
                  </p>
                </td>
                <td className="py-2 pr-4">
                  <span className="text-sm font-semibold">
                    {formatAmount(request.price)}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <ShopRequestStatusBadge request={request} />
                </td>
                <td className="py-2">
                  <ShopRequestActions
                    onApprove={onApprove}
                    onDeny={onDeny}
                    request={request}
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

function CompactShopRequestMobileRow({
  onApprove,
  onDeny,
  request,
}: {
  onApprove: (purchaseId: string) => void;
  onDeny: (purchaseId: string) => void;
  request: ShopPurchaseRequest;
}) {
  return (
    <article className="theme-card flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{request.itemName}</p>
        <p className="mt-1 truncate text-xs text-text-muted">
          {formatDateTime(request.purchasedAt)}
        </p>
        <p className="mt-1 truncate text-xs text-text-muted">
          {request.studentName}
        </p>
        <p className="mt-1">
          <span className="text-sm font-semibold">
            {formatAmount(request.price)}
          </span>
        </p>
      </div>
      <ShopRequestActions
        onApprove={onApprove}
        onDeny={onDeny}
        request={request}
      />
    </article>
  );
}

function ShopRequestCard({
  onApprove,
  onDeny,
  request,
}: {
  onApprove: (purchaseId: string) => void;
  onDeny: (purchaseId: string) => void;
  request: ShopPurchaseRequest;
}) {
  return (
    <article className="theme-card p-3 transition hover:border-brand-soft-strong hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
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
        <span className="shrink-0 text-right text-sm font-semibold">
          {formatAmount(request.price)}
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
