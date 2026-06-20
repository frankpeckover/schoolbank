"use client";

import { useState } from "react";
import type { SessionUser } from "@/lib/session";
import { ShopRequestsPanel } from "@/components/shop/shop-requests-panel";
import { LedgerAdjustmentForm } from "@/components/transactions/ledger-adjustment-form";

type TeacherDashboardPanelProps = {
  currencyName: string;
  currentUser: SessionUser;
};

export function TeacherDashboardPanel({
  currencyName,
  currentUser,
}: TeacherDashboardPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <>
      <ShopRequestsPanel
        currencyName={currencyName}
        currentUser={currentUser}
      />

      <section className="mt-5 rounded-md border border-border bg-surface p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">
            Give or Take {currencyName}
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Add or remove {currencyName.toLowerCase()} for a student or group.
          </p>
        </div>

        <LedgerAdjustmentForm
          currencyName={currencyName}
          currentUser={currentUser}
          onCreated={() => setMessage("Transaction recorded.")}
          onError={setError}
        />

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
      </section>
    </>
  );
}
