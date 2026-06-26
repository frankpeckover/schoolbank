"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getStudentGoal,
  saveStudentGoal,
} from "@/lib/actions";
import { formatCurrencyAmount } from "@/lib/formatters";
import type { StudentGoal } from "@/services/student-goal-service";
import { PencilIcon, TargetIcon } from "@/components/ui/icons";

type StudentGoalCardProps = {
  balance: number;
  currencyName: string;
};

const progressRingSize = 156;
const progressRingStrokeWidth = 14;
const progressRingRadius =
  (progressRingSize - progressRingStrokeWidth) / 2;
const progressRingCircumference = 2 * Math.PI * progressRingRadius;
const progressCompletePercent = 100;
const emptyProgressPercent = 0;

export function StudentGoalCard({
  balance,
  currencyName,
}: StudentGoalCardProps) {
  const [goal, setGoal] = useState<StudentGoal | null>(null);
  const [goalTitle, setGoalTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadGoal() {
      try {
        const loadedGoal = await getStudentGoal();

        if (isMounted) {
          setGoal(loadedGoal);
          setGoalTitle(loadedGoal?.title ?? "");
          setTargetAmount(
            loadedGoal ? String(loadedGoal.targetAmount) : "",
          );
          setIsEditing(!loadedGoal);
        }
      } catch {
        if (isMounted) {
          setMessage("Could not load goal.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadGoal();

    return () => {
      isMounted = false;
    };
  }, []);

  const progressPercent = useMemo(
    () => getGoalProgressPercent(balance, goal?.targetAmount ?? 0),
    [balance, goal?.targetAmount],
  );

  async function handleSaveGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const parsedTargetAmount = Number.parseInt(targetAmount, 10);

    if (!Number.isFinite(parsedTargetAmount) || parsedTargetAmount <= 0) {
      setMessage("Enter a goal amount greater than 0.");
      setIsSaving(false);
      return;
    }

    const result = await saveStudentGoal({
      targetAmount: parsedTargetAmount,
      title: goalTitle,
    });

    if (!result.ok) {
      setMessage(result.message);
      setIsSaving(false);
      return;
    }

    const refreshedGoal = await getStudentGoal();
    setGoal(refreshedGoal);
    setGoalTitle(refreshedGoal?.title ?? "");
    setTargetAmount(refreshedGoal ? String(refreshedGoal.targetAmount) : "");
    setIsEditing(false);
    setMessage("Goal saved.");
    setIsSaving(false);
  }

  function handleTargetAmountChange(value: string) {
    setTargetAmount(value.replace(/\D/g, ""));
  }

  return (
    <article className="rounded-3xl border border-border-subtle bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <TargetIcon />
          </span>
          <h2 className="truncate text-base font-semibold text-foreground">
            Goal
          </h2>
        </div>

        {goal && !isEditing && (
          <button
            aria-label="Edit goal"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border-subtle text-text-control transition hover:bg-panel-soft"
            onClick={() => setIsEditing(true)}
            type="button"
          >
            <PencilIcon />
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex min-h-48 items-center justify-center">
          <p className="text-sm text-text-muted">Loading goal...</p>
        </div>
      )}

      {!isLoading && !isEditing && goal && (
        <div className="mt-5 flex flex-col items-center text-center">
          <GoalProgressRing progressPercent={progressPercent} />
          <p className="mt-4 max-w-full truncate text-lg font-semibold text-foreground">
            {goal.title}
          </p>
          <p className="mt-1 text-sm font-semibold text-text-muted">
            {formatCurrencyAmount(balance, currencyName)} of{" "}
            {formatCurrencyAmount(goal.targetAmount, currencyName)}
          </p>
        </div>
      )}

      {!isLoading && isEditing && (
        <form className="mt-5 space-y-3" onSubmit={handleSaveGoal}>
          <label className="block text-sm font-semibold text-text-control">
            Goal name
            <input
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand"
              maxLength={48}
              onChange={(event) => setGoalTitle(event.target.value)}
              placeholder="Bike, camp, reward..."
              value={goalTitle}
            />
          </label>

          <label className="block text-sm font-semibold text-text-control">
            Target amount
            <input
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand"
              inputMode="numeric"
              onChange={(event) =>
                handleTargetAmountChange(event.target.value)
              }
              placeholder="100"
              value={targetAmount}
            />
          </label>

          <button
            className="w-full rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Saving..." : "Save goal"}
          </button>
        </form>
      )}

      {message && (
        <p className="mt-3 rounded-md bg-panel-soft px-3 py-2 text-sm font-semibold text-text-muted">
          {message}
        </p>
      )}
    </article>
  );
}

function GoalProgressRing({
  progressPercent,
}: {
  progressPercent: number;
}) {
  const strokeOffset =
    progressRingCircumference -
    (progressPercent / progressCompletePercent) * progressRingCircumference;

  return (
    <div className="relative h-40 w-40">
      <svg
        className="-rotate-90"
        height={progressRingSize}
        viewBox={`0 0 ${progressRingSize} ${progressRingSize}`}
        width={progressRingSize}
      >
        <circle
          cx={progressRingSize / 2}
          cy={progressRingSize / 2}
          fill="none"
          r={progressRingRadius}
          stroke="var(--progress-track)"
          strokeWidth={progressRingStrokeWidth}
        />
        <circle
          cx={progressRingSize / 2}
          cy={progressRingSize / 2}
          fill="none"
          r={progressRingRadius}
          stroke="var(--brand)"
          strokeDasharray={progressRingCircumference}
          strokeDashoffset={strokeOffset}
          strokeLinecap="round"
          strokeWidth={progressRingStrokeWidth}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold text-foreground">
          {Math.round(progressPercent)}%
        </span>
        <span className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-text-kicker">
          saved
        </span>
      </div>
    </div>
  );
}

function getGoalProgressPercent(balance: number, targetAmount: number) {
  if (targetAmount <= 0) {
    return emptyProgressPercent;
  }

  return Math.min(
    progressCompletePercent,
    Math.max(emptyProgressPercent, (balance / targetAmount) * progressCompletePercent),
  );
}
