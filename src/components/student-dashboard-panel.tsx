"use client";

import { useEffect, useState } from "react";
import { StudentShopRequestsPanel } from "@/components/shop/student-shop-requests-panel";
import { TransactionLogPanel } from "@/components/transactions/transaction-log-panel";
import { getStudentBalance } from "@/lib/actions";
import type { SessionUser } from "@/lib/session";

type StudentDashboardPanelProps = {
  currencyName: string;
  currentUser: SessionUser;
};

export function StudentDashboardPanel({
  currencyName,
  currentUser,
}: StudentDashboardPanelProps) {
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBalance() {
      try {
        const currentBalance = await getStudentBalance(currentUser);

        if (isMounted) {
          setBalance(currentBalance);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load balance.");
        }
      }
    }

    loadBalance();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  return (
    <>
      <section className="mt-5 rounded-md border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Current Balance</h2>
            <p className="mt-1 text-sm text-text-muted">
              Your available {currencyName.toLowerCase()}.
            </p>
          </div>
          <p className="text-3xl font-semibold text-brand">
            {balance} {currencyName}
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
            {error}
          </p>
        )}
      </section>

      <StudentShopRequestsPanel
        currencyName={currencyName}
        currentUser={currentUser}
      />

      <TransactionLogPanel
        currencyName={currencyName}
        currentUser={currentUser}
      />
    </>
  );
}
