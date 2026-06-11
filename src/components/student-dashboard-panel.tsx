"use client";

import { useEffect, useState } from "react";
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
      <section className="mt-5 rounded-md border border-border bg-surface p-5 shadow-sm">
        <div>
          <h2 className="text-2xl font-semibold">Current Balance</h2>
          <p className="mt-1 text-sm text-text-muted">
            Your available {currencyName.toLowerCase()}.
          </p>
        </div>

        <p className="mt-5 text-4xl font-semibold text-brand">
          {balance} {currencyName}
        </p>

        {error && (
          <p className="mt-4 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
            {error}
          </p>
        )}
      </section>

      <TransactionLogPanel
        currencyName={currencyName}
        currentUser={currentUser}
      />
    </>
  );
}
