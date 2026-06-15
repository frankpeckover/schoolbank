"use client";

import { useState, type FormEvent } from "react";
import { createLedgerAdjustment } from "@/lib/actions";
import type { SessionUser } from "@/lib/session";
import type { StudentListItem } from "@/services/user-service";

type LedgerAdjustmentFormProps = {
  currencyName: string;
  currentUser: SessionUser;
  onCreated: () => void;
  students: StudentListItem[];
};

export function LedgerAdjustmentForm({
  currencyName,
  currentUser,
  onCreated,
  students,
}: LedgerAdjustmentFormProps) {
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [reason, setReason] = useState("");
  const [studentUserId, setStudentUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const parsedAmount = Number(amount);
    const signedAmount = direction === "add" ? parsedAmount : -parsedAmount;
    const result = await createLedgerAdjustment(currentUser, {
      amount: signedAmount,
      reason,
      studentUserId,
    });

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    setAmount("");
    setDirection("add");
    setReason("");
    setStudentUserId("");
    setError(null);
    setIsSaving(false);
    onCreated();
  }

  return (
    <form
      className="mt-4 grid gap-3 rounded-md border border-border-subtle bg-panel-soft p-3 lg:grid-cols-[1fr_140px_140px_1.4fr_auto]"
      onSubmit={handleSubmit}
    >
      <div>
        <label className="text-sm font-semibold text-text-control" htmlFor="student">
          Student
        </label>
        <select
          className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none ring-brand transition focus:ring-2"
          id="student"
          onChange={(event) => setStudentUserId(event.target.value)}
          value={studentUserId}
        >
          <option value="">Select student</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.displayName} ({student.username})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-semibold text-text-control" htmlFor="direction">
          Action
        </label>
        <select
          className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none ring-brand transition focus:ring-2"
          id="direction"
          onChange={(event) =>
            setDirection(event.target.value === "remove" ? "remove" : "add")
          }
          value={direction}
        >
          <option value="add">Add</option>
          <option value="remove">Remove</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-semibold text-text-control" htmlFor="amount">
          {currencyName}
        </label>
        <input
          className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none ring-brand transition focus:ring-2"
          id="amount"
          min="0"
          onChange={(event) => setAmount(event.target.value)}
          type="number"
          value={amount}
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-text-control" htmlFor="reason">
          Reason
        </label>
        <input
          className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none ring-brand transition focus:ring-2"
          id="reason"
          onChange={(event) => setReason(event.target.value)}
          value={reason}
        />
      </div>

      <div className="flex flex-col justify-end">
        <button
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      {error && (
        <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong lg:col-span-5">
          {error}
        </p>
      )}
    </form>
  );
}
