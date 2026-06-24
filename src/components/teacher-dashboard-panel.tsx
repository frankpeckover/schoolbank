"use client";

import { useState } from "react";
import { ShopRequestsPanel } from "@/components/shop/shop-requests-panel";
import { LedgerAdjustmentForm } from "@/components/transactions/ledger-adjustment-form";
import { SparkleIcon } from "@/components/ui/icons";

type TeacherDashboardPanelProps = {
  currencyName: string;
  schoolName: string;
};

export function TeacherDashboardPanel({
  currencyName,
  schoolName,
}: TeacherDashboardPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <>
      <ShopRequestsPanel
        currencyName={currencyName}
      />

      <section className="theme-panel mt-5 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
            <SparkleIcon />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold">
              Give or Take {currencyName}
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {schoolName} students and groups.
            </p>
          </div>
        </div>

        <LedgerAdjustmentForm
          currencyName={currencyName}
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
