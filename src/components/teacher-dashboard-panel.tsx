"use client";

import { useEffect, useState } from "react";
import { listStudents } from "@/lib/actions";
import type { SessionUser } from "@/lib/session";
import type { StudentListItem } from "@/services/user-service";
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
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStudents() {
      try {
        const loadedStudents = await listStudents();

        if (isMounted) {
          setStudents(loadedStudents);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load students.");
        }
      }
    }

    loadStudents();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <ShopRequestsPanel
        currencyName={currencyName}
        currentUser={currentUser}
      />

      <section className="mt-5 rounded-md border border-border bg-surface p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">Create Transaction</h2>
          <p className="mt-1 text-sm text-text-muted">
            Add or remove {currencyName.toLowerCase()} for a student.
          </p>
        </div>

        <LedgerAdjustmentForm
          currencyName={currencyName}
          currentUser={currentUser}
          onCreated={() => setMessage("Transaction recorded.")}
          students={students}
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
