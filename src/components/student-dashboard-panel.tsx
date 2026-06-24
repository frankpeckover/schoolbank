"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { StudentShopRequestsPanel } from "@/components/shop/student-shop-requests-panel";
import { TransactionLogPanel } from "@/components/transactions/transaction-log-panel";
import {
  ClockIcon,
  ShoppingBagIcon,
  SparkleIcon,
} from "@/components/ui/icons";
import { getStudentBalance } from "@/lib/actions";
import { formatCurrencyAmount } from "@/lib/formatters";
import type { SessionUser } from "@/lib/session";

type StudentDashboardPanelProps = {
  currencyName: string;
  currentUser: SessionUser;
  schoolName: string;
};

export function StudentDashboardPanel({
  currencyName,
  currentUser,
  schoolName,
}: StudentDashboardPanelProps) {
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBalance() {
      try {
        const currentBalance = await getStudentBalance();

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
  }, []);

  return (
    <>
      <section className="motion-panel mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <StudentWalletCard
          balance={balance}
          currencyName={currencyName}
          currentUser={currentUser}
        />
        <StudentWalletGuide
          currencyName={currencyName}
          schoolName={schoolName}
        />

        {error && (
          <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong lg:col-span-2">
            {error}
          </p>
        )}
      </section>

      <StudentShopRequestsPanel
        currencyName={currencyName}
      />

      <TransactionLogPanel
        currencyName={currencyName}
        currentUser={currentUser}
        description="Account activity."
        title="Recent Activity"
      />
    </>
  );
}

function StudentWalletCard({
  balance,
  currencyName,
  currentUser,
}: {
  balance: number;
  currencyName: string;
  currentUser: SessionUser;
}) {
  return (
    <article className="section-highlight wallet-card rounded-md border border-brand-soft-strong p-5 text-foreground shadow-sm transition hover:shadow-md sm:p-6">
      <div className="relative flex h-full min-h-52 flex-col items-center justify-center gap-4 text-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-kicker">
            Student Wallet
          </p>
          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
            {currentUser.displayName}
          </h2>
        </div>

        <div>
          <p className="text-sm font-semibold text-text-muted">
            Available balance
          </p>
          <p className="mt-2 break-words text-5xl font-semibold text-brand-ink sm:text-6xl">
            {formatCurrencyAmount(balance, currencyName)}
          </p>
        </div>
      </div>
    </article>
  );
}

function StudentWalletGuide({
  currencyName,
  schoolName,
}: {
  currencyName: string;
  schoolName: string;
}) {
  return (
    <article className="rounded-md border border-border-subtle bg-surface p-4 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-kicker">
          At a glance
        </p>
        <h3 className="mt-2 text-lg font-semibold">How your wallet moves</h3>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
        <WalletGuideRow
          description={`${schoolName} staff add or remove ${currencyName.toLowerCase()}.`}
          icon={<SparkleIcon />}
          title="Earn"
        />
        <WalletGuideRow
          description="Requests hold funds until approved."
          icon={<ShoppingBagIcon />}
          title="Request"
        />
        <WalletGuideRow
          description="Every change appears below."
          icon={<ClockIcon />}
          title="Track"
        />
      </div>
    </article>
  );
}

function WalletGuideRow({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="theme-subpanel p-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
          {icon}
        </span>
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="mt-1 text-sm leading-5 text-text-muted">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
