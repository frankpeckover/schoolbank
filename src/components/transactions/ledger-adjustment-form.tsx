"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createGroupLedgerAdjustment,
  createLedgerAdjustment,
  listGroups,
  searchStudents,
} from "@/lib/actions";
import { AdjustmentDetailsPanel } from "@/components/transactions/adjustment-details-panel";
import { AdjustmentRecipientPanel } from "@/components/transactions/adjustment-recipient-panel";
import type {
  AdjustmentDirection,
  AdjustmentTarget,
} from "@/components/transactions/ledger-adjustment-types";
import type { SessionUser } from "@/lib/session";
import type { GroupListItem } from "@/services/group-service";
import type { StudentListItem } from "@/services/user-service";

type LedgerAdjustmentFormProps = {
  currencyName: string;
  currentUser: SessionUser;
  onCreated: () => void;
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
const recentStudentLimit = 6;
const emptyStudentResults: StudentListItem[] = [];
const emptyGroupResults: GroupListItem[] = [];

export function LedgerAdjustmentForm({
  currencyName,
  currentUser,
  onCreated,
  onError,
}: LedgerAdjustmentFormProps) {
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<AdjustmentDirection>("add");
  const [target, setTarget] = useState<AdjustmentTarget>("student");
  const [reason, setReason] = useState(reasonPresets[0]);
  const [groups, setGroups] = useState<GroupListItem[]>(emptyGroupResults);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState<StudentListItem[]>(
    emptyStudentResults,
  );
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(
    null,
  );
  const [recentStudents, setRecentStudents] = useState<StudentListItem[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) ?? null;
  const selectedAmount = Number(amount);
  const hasTarget = target === "student" ? Boolean(selectedStudent) : Boolean(selectedGroup);
  const canSubmit =
    hasTarget &&
    Number.isInteger(selectedAmount) &&
    selectedAmount > 0 &&
    Boolean(reason.trim()) &&
    !isSaving;
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
        selectedStudent ? student.id !== selectedStudent.id : true,
      ),
    [recentStudents, selectedStudent],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      onError("Select a recipient, amount, and reason.");
      return;
    }

    setIsSaving(true);

    const signedAmount = direction === "add" ? selectedAmount : -selectedAmount;
    const result =
      target === "student" && selectedStudent
        ? await createLedgerAdjustment(currentUser, {
            amount: signedAmount,
            reason,
            studentUserId: selectedStudent.id,
          })
        : await createGroupLedgerAdjustment(currentUser, {
            amount: signedAmount,
            groupId: selectedGroupId,
            reason,
          });

    if (!result.ok) {
      onError(result.message);
      setIsSaving(false);
      return;
    }

    if (target === "student" && selectedStudent) {
      setRecentStudents((current) =>
        [selectedStudent, ...current.filter((student) => student.id !== selectedStudent.id)]
          .slice(0, recentStudentLimit),
      );
    }

    setAmount("");
    setDirection("add");
    setReason(reasonPresets[0]);
    setSelectedStudent(null);
    setSelectedGroupId("");
    setStudentQuery("");
    setIsSaving(false);
    onError(null);
    onCreated();
  }

  function selectStudent(student: StudentListItem) {
    setSelectedStudent(student);
    setStudentQuery(`${student.displayName} (${student.username})`);
  }

  function handleTargetChange(nextTarget: AdjustmentTarget) {
    setTarget(nextTarget);
    setSelectedStudent(null);
    setSelectedGroupId("");
    setStudentQuery("");
  }

  function handleStudentQueryChange(value: string) {
    setStudentQuery(value);
    setSelectedStudent(null);
  }

  return (
    <form
      className="mt-4 grid gap-4 rounded-md border border-border-subtle bg-panel-soft p-3 xl:grid-cols-[minmax(280px,1.1fr)_minmax(320px,1.2fr)]"
      onSubmit={handleSubmit}
    >
      <AdjustmentRecipientPanel
        groups={groups}
        isLoadingGroups={isLoadingGroups}
        isSearching={isSearching}
        onGroupChange={setSelectedGroupId}
        onStudentQueryChange={handleStudentQueryChange}
        onStudentSelect={selectStudent}
        onTargetChange={handleTargetChange}
        recentStudents={visibleRecentStudents}
        selectedGroup={selectedGroup}
        selectedGroupId={selectedGroupId}
        selectedStudent={selectedStudent}
        studentQuery={studentQuery}
        studentResults={studentResults}
        target={target}
      />

      <AdjustmentDetailsPanel
        amount={amount}
        amountPresets={amountPresets}
        canSubmit={canSubmit}
        currencyName={currencyName}
        direction={direction}
        isSaving={isSaving}
        onAmountChange={setAmount}
        onDirectionChange={setDirection}
        onReasonChange={setReason}
        reason={reason}
        reasonPresets={reasonPresets}
        submitLabel={submitLabel}
      />
    </form>
  );
}
