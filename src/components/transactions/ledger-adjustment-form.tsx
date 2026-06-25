"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createGroupLedgerAdjustment,
  createLedgerAdjustments,
  listGroups,
  searchStudents,
} from "@/lib/actions";
import { AdjustmentRecipientPanel } from "@/components/transactions/adjustment-recipient-panel";
import type {
  AdjustmentDirection,
  AdjustmentTarget,
} from "@/components/transactions/ledger-adjustment-types";
import type { GroupListItem } from "@/services/group-service";
import type { StudentListItem } from "@/services/user-service";

type LedgerAdjustmentFormProps = {
  currencyName: string;
  onCreated: (message: string) => void;
  onError: (message: string | null) => void;
};

const amountPresets = [1, 5, 10, 25, 50];
const reasonPresets = [
  "Great effort",
  "Helping others",
  "Homework complete",
  "Positive participation",
  "Late work",
  "Class disruption",
];
const studentSearchDebounceMs = 250;
const studentSearchMinChars = 2;
const recentStudentLimit = 6;
const emptyStudentResults: StudentListItem[] = [];
const emptyGroupResults: GroupListItem[] = [];
type AdjustmentStep = "recipient" | "amount" | "reason";

export function LedgerAdjustmentForm({
  currencyName,
  onCreated,
  onError,
}: LedgerAdjustmentFormProps) {
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<AdjustmentDirection>("add");
  const [target, setTarget] = useState<AdjustmentTarget>("student");
  const [reason, setReason] = useState("");
  const [groups, setGroups] = useState<GroupListItem[]>(emptyGroupResults);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState<StudentListItem[]>(
    emptyStudentResults,
  );
  const [step, setStep] = useState<AdjustmentStep>("recipient");
  const [selectedStudents, setSelectedStudents] = useState<StudentListItem[]>(
    [],
  );
  const [recentStudents, setRecentStudents] = useState<StudentListItem[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) ?? null;
  const selectedAmount = Number(amount);
  const hasTarget =
    target === "student" ? selectedStudents.length > 0 : Boolean(selectedGroup);
  const hasAmount = Number.isInteger(selectedAmount) && selectedAmount > 0;
  const canSubmit =
    hasTarget &&
    hasAmount &&
    Boolean(reason.trim()) &&
    !isSaving;
  const recipientLabel = getRecipientLabel(
    target,
    selectedStudents,
    selectedGroup,
  );
  const submitLabel =
    direction === "add" ? `Add ${currencyName}` : `Take ${currencyName}`;

  useEffect(() => {
    let isActive = true;

    async function loadGroups() {
      try {
        const loadedGroups = await listGroups(false);

        if (isActive) {
          setGroups(loadedGroups);
          onError(null);
        }
      } catch {
        if (isActive) {
          setGroups(emptyGroupResults);
          onError("Could not load groups.");
        }
      } finally {
        if (isActive) {
          setIsLoadingGroups(false);
        }
      }
    }

    loadGroups();

    return () => {
      isActive = false;
    };
  }, [onError]);

  useEffect(() => {
    let isActive = true;

    if (studentQuery.trim().length < studentSearchMinChars) {
      return () => {
        isActive = false;
      };
    }

    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);

      try {
        const students = await searchStudents(studentQuery);

        if (isActive) {
          setStudentResults(students);
          onError(null);
        }
      } catch {
        if (isActive) {
          setStudentResults(emptyStudentResults);
          onError("Could not search students.");
        }
      } finally {
        if (isActive) {
          setIsSearching(false);
        }
      }
    }, studentSearchDebounceMs);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [studentQuery, onError]);

  const visibleRecentStudents = useMemo(
    () =>
      recentStudents.filter((student) =>
        selectedStudents.every(
          (selectedStudent) => selectedStudent.id !== student.id,
        ),
      ),
    [recentStudents, selectedStudents],
  );

  async function handleSubmit() {
    if (!canSubmit) {
      onError("Select a recipient, amount, and reason.");
      return;
    }

    setIsSaving(true);

    const signedAmount = direction === "add" ? selectedAmount : -selectedAmount;
    const result =
      target === "student"
        ? await createLedgerAdjustments({
            amount: signedAmount,
            reason,
            studentUserIds: selectedStudents.map((student) => student.id),
          })
        : await createGroupLedgerAdjustment({
            amount: signedAmount,
            groupId: selectedGroupId,
            reason,
          });

    if (!result.ok) {
      onError(result.message);
      setIsSaving(false);
      return;
    }

    const successMessage = getAdjustmentSuccessMessage({
      amount: selectedAmount,
      currencyName,
      direction,
      reason,
      recipientLabel,
    });

    if (target === "student") {
      setRecentStudents((current) =>
        [
          ...selectedStudents,
          ...current.filter(
            (student) =>
              !selectedStudents.some(
                (selectedStudent) => selectedStudent.id === student.id,
              ),
          ),
        ]
          .slice(0, recentStudentLimit),
      );
    }

    setAmount("");
    setDirection("add");
    setReason("");
    setSelectedStudents([]);
    setSelectedGroupId("");
    setStudentQuery("");
    setStep("recipient");
    setIsSaving(false);
    onError(null);
    onCreated(successMessage);
  }

  function selectStudent(student: StudentListItem) {
    setSelectedStudents((current) =>
      current.some((selectedStudent) => selectedStudent.id === student.id)
        ? current
        : [...current, student],
    );
    setStudentQuery("");
    setStudentResults(emptyStudentResults);
  }

  function handleTargetChange(nextTarget: AdjustmentTarget) {
    setTarget(nextTarget);
    setSelectedStudents([]);
    setSelectedGroupId("");
    setStudentQuery("");
  }

  function handleStudentQueryChange(value: string) {
    setStudentQuery(value);

    if (value.trim().length < studentSearchMinChars) {
      setStudentResults(emptyStudentResults);
      setIsSearching(false);
    }
  }

  function removeSelectedStudent(studentId: string) {
    setSelectedStudents((current) =>
      current.filter((student) => student.id !== studentId),
    );
  }

  function goToNextStep() {
    onError(null);

    if (step === "recipient") {
      if (!hasTarget) {
        onError("Choose a student or group.");
        return;
      }

      setStep("amount");
      return;
    }

    if (step === "amount") {
      if (!hasAmount) {
        onError("Enter a whole number amount greater than zero.");
        return;
      }

      setStep("reason");
    }
  }

  function goToPreviousStep() {
    onError(null);

    if (step === "amount") {
      setStep("recipient");
      return;
    }

    if (step === "reason") {
      setStep("amount");
    }
  }

  return (
    <form
      className="theme-subpanel mt-4 p-3"
      onSubmit={(event) => event.preventDefault()}
    >
      <div>
        {step === "recipient" && (
          <AdjustmentRecipientPanel
            groups={groups}
            isLoadingGroups={isLoadingGroups}
            isSearching={isSearching}
            onGroupChange={setSelectedGroupId}
            onStudentQueryChange={handleStudentQueryChange}
            onStudentRemove={removeSelectedStudent}
            onStudentSelect={selectStudent}
            onTargetChange={handleTargetChange}
            recentStudents={visibleRecentStudents}
            searchMinChars={studentSearchMinChars}
            selectedGroup={selectedGroup}
            selectedGroupId={selectedGroupId}
            selectedStudents={selectedStudents}
            studentQuery={studentQuery}
            studentResults={studentResults}
            target={target}
          />
        )}

        {step === "amount" && (
          <AdjustmentAmountStep
            amount={amount}
            currencyName={currencyName}
            direction={direction}
            onAmountChange={setAmount}
            onDirectionChange={setDirection}
          />
        )}

        {step === "reason" && (
          <AdjustmentReasonStep
            amount={selectedAmount}
            currencyName={currencyName}
            direction={direction}
            onReasonChange={setReason}
            reason={reason}
            reasonPresets={reasonPresets}
            recipientLabel={recipientLabel}
          />
        )}
      </div>

      <AdjustmentStepActions
        canGoBack={step !== "recipient"}
        canSubmit={canSubmit}
        isSaving={isSaving}
        onBack={goToPreviousStep}
        onNext={goToNextStep}
        onSubmit={handleSubmit}
        step={step}
        submitLabel={submitLabel}
      />
    </form>
  );
}

function AdjustmentAmountStep({
  amount,
  currencyName,
  direction,
  onAmountChange,
  onDirectionChange,
}: {
  amount: string;
  currencyName: string;
  direction: AdjustmentDirection;
  onAmountChange: (value: string) => void;
  onDirectionChange: (direction: AdjustmentDirection) => void;
}) {
  return (
    <section className="theme-card p-3">
      <div>
        <h3 className="text-base font-semibold">Action and Amount</h3>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(12rem,0.7fr)_1fr]">
        <DirectionToggle
          direction={direction}
          onChange={onDirectionChange}
        />

        <AmountField
          amount={amount}
          currencyName={currencyName}
          onAmountChange={onAmountChange}
          presets={amountPresets}
        />
      </div>
    </section>
  );
}

function AdjustmentReasonStep({
  amount,
  currencyName,
  direction,
  onReasonChange,
  reason,
  reasonPresets,
  recipientLabel,
}: {
  amount: number;
  currencyName: string;
  direction: AdjustmentDirection;
  onReasonChange: (value: string) => void;
  reason: string;
  reasonPresets: string[];
  recipientLabel: string;
}) {
  const actionLabel = direction === "add" ? "Add" : "Take";

  return (
    <section className="theme-card p-3">
      <div>
        <h3 className="text-base font-semibold">Reason</h3>
      </div>

      <div className="theme-subpanel mt-4 p-3">
        <p className="text-sm font-semibold text-text-control">
          {actionLabel} {amount} {currencyName}
        </p>
        <p className="mt-1 text-sm text-text-muted">
          {recipientLabel || "No recipient selected"}
        </p>
      </div>

      <ReasonField
        onReasonChange={onReasonChange}
        presets={reasonPresets}
        reason={reason}
      />
    </section>
  );
}

function DirectionToggle({
  direction,
  onChange,
}: {
  direction: AdjustmentDirection;
  onChange: (direction: AdjustmentDirection) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-text-control">Action</p>
      <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-md border border-button-border">
        <button
          className={`px-4 py-3 text-sm font-semibold transition ${
            direction === "add"
              ? "bg-brand text-white"
              : "bg-surface text-text-control hover:bg-panel-soft"
          }`}
          onClick={() => onChange("add")}
          type="button"
        >
          Add
        </button>
        <button
          className={`px-4 py-3 text-sm font-semibold transition ${
            direction === "remove"
              ? "bg-danger text-white"
              : "bg-surface text-text-control hover:bg-panel-soft"
          }`}
          onClick={() => onChange("remove")}
          type="button"
        >
          Take
        </button>
      </div>
    </div>
  );
}

function AmountField({
  amount,
  currencyName,
  onAmountChange,
  presets,
}: {
  amount: string;
  currencyName: string;
  onAmountChange: (value: string) => void;
  presets: number[];
}) {
  return (
    <div>
      <label
        className="text-sm font-semibold text-text-control"
        htmlFor="amount"
      >
        {currencyName}
      </label>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {presets.map((preset) => (
          <button
            className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
              amount === String(preset)
                ? "border-brand bg-brand text-white"
                : "border-button-border text-text-control hover:bg-panel-soft"
            }`}
            key={preset}
            onClick={() => onAmountChange(String(preset))}
            type="button"
          >
            {preset}
          </button>
        ))}
      </div>
      <input
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id="amount"
        min="1"
        onChange={(event) => onAmountChange(event.target.value)}
        placeholder="Custom amount"
        type="number"
        value={amount}
      />
    </div>
  );
}

function ReasonField({
  onReasonChange,
  presets,
  reason,
}: {
  onReasonChange: (value: string) => void;
  presets: string[];
  reason: string;
}) {
  return (
    <div className="mt-4">
      <label
        className="text-sm font-semibold text-text-control"
        htmlFor="reason"
      >
        Reason
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
              reason === preset
                ? "border-brand bg-brand text-white"
                : "border-button-border text-text-control hover:bg-panel-soft"
            }`}
            key={preset}
            onClick={() => onReasonChange(preset)}
            type="button"
          >
            {preset}
          </button>
        ))}
      </div>
      <input
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id="reason"
        onChange={(event) => onReasonChange(event.target.value)}
        value={reason}
      />
    </div>
  );
}

function AdjustmentStepActions({
  canGoBack,
  canSubmit,
  isSaving,
  onBack,
  onNext,
  onSubmit,
  step,
  submitLabel,
}: {
  canGoBack: boolean;
  canSubmit: boolean;
  isSaving: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  step: AdjustmentStep;
  submitLabel: string;
}) {
  const isFinalStep = step === "reason";

  return (
    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
      <button
        className="rounded-md border border-button-border px-4 py-3 text-sm font-semibold text-text-control transition hover:bg-panel-soft disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!canGoBack || isSaving}
        onClick={onBack}
        type="button"
      >
        Back
      </button>

      {isFinalStep ? (
        <button
          className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
          disabled={!canSubmit}
          onClick={onSubmit}
          type="button"
        >
          {isSaving ? "Saving..." : submitLabel}
        </button>
      ) : (
        <button
          className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover"
          onClick={onNext}
          type="button"
        >
          Continue
        </button>
      )}
    </div>
  );
}

function getRecipientLabel(
  target: AdjustmentTarget,
  selectedStudents: StudentListItem[],
  selectedGroup: GroupListItem | null,
) {
  if (target === "student" && selectedStudents.length === 1) {
    const selectedStudent = selectedStudents[0];
    return `${selectedStudent.displayName} (${selectedStudent.username})`;
  }

  if (target === "student" && selectedStudents.length > 1) {
    return `${selectedStudents.length} students`;
  }

  if (target === "group" && selectedGroup) {
    return `${selectedGroup.name} (${selectedGroup.memberCount} members)`;
  }

  return "";
}

function getAdjustmentSuccessMessage({
  amount,
  currencyName,
  direction,
  reason,
  recipientLabel,
}: {
  amount: number;
  currencyName: string;
  direction: AdjustmentDirection;
  reason: string;
  recipientLabel: string;
}) {
  const action = direction === "add" ? "Added" : "Removed";
  const preposition = direction === "add" ? "to" : "from";

  return `${action} ${amount} ${currencyName} ${preposition} ${recipientLabel} for ${reason}.`;
}
