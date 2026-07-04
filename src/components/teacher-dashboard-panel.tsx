"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ShopRequestsPanel } from "@/components/shop/shop-requests-panel";
import { StudentBalanceCard } from "@/components/student-balance-card";
import { LedgerAdjustmentForm } from "@/components/transactions/ledger-adjustment-form";
import {
  PlusIcon,
  SparkleIcon,
  UsersIcon,
  XIcon,
} from "@/components/ui/icons";
import { SearchInput } from "@/components/ui/search-input";
import {
  getCurrentTeacherClass,
  listGroups,
  listStudentBalances,
} from "@/lib/actions";
import type { AdjustmentDirection } from "@/components/transactions/ledger-adjustment-types";
import type { GroupListItem } from "@/services/group-service";
import type { CurrentClass } from "@/services/timetable-service";
import type { StudentBalanceItem } from "@/services/transaction-service";
import type { StudentListItem } from "@/services/user-service";

type TeacherDashboardPanelProps = {
  currencyName: string;
  schoolName: string;
};

type AdjustmentTargetSelection =
  | {
      direction: AdjustmentDirection;
      group: GroupListItem;
      kind: "group";
      version: number;
    }
  | {
      direction: AdjustmentDirection;
      kind: "students";
      students: StudentListItem[];
      version: number;
    };

export function TeacherDashboardPanel({
  currencyName,
}: TeacherDashboardPanelProps) {
  const [currentClass, setCurrentClass] = useState<CurrentClass | null>(null);
  const [studentBalances, setStudentBalances] = useState<StudentBalanceItem[]>(
    [],
  );
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] =
    useState<AdjustmentTargetSelection | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const [loadedCurrentClass, loadedBalances, loadedGroups] =
          await Promise.all([
            getCurrentTeacherClass(),
            listStudentBalances(),
            listGroups(false),
          ]);

        if (isMounted) {
          setCurrentClass(loadedCurrentClass);
          setStudentBalances(loadedBalances.filter((student) => student.isActive));
          setGroups(loadedGroups.filter((group) => group.isActive));
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load teacher dashboard.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleStudents = useMemo(
    () => getVisibleStudents(search, currentClass, studentBalances),
    [currentClass, search, studentBalances],
  );
  const visibleGroups = useMemo(
    () => getVisibleGroups(search, groups),
    [groups, search],
  );
  const isDefaultingToCurrentClass = search.trim().length === 0;

  function handleStudentsSelected(
    students: StudentListItem[],
    direction: AdjustmentDirection,
  ) {
    setSelection({
      direction,
      kind: "students",
      students,
      version: Date.now(),
    });
  }

  function handleGroupSelected(
    group: GroupListItem,
    direction: AdjustmentDirection,
  ) {
    setSelection({
      direction,
      group,
      kind: "group",
      version: Date.now(),
    });
  }

  function handleIssueAllShown() {
    if (visibleStudents.length === 0) {
      return;
    }

    handleStudentsSelected(visibleStudents.map(toStudentListItem), "add");
  }

  return (
    <>
    <section className="motion-panel mt-5">
        {isLoading && (
          <p className="mt-4 text-sm text-text-muted">Loading students...</p>
        )}
        {error && (
          <p className="mt-4 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
            {error}
          </p>
        )}

        {!isLoading && !error && (
          <div>
            <ShopRequestsPanel
              className="mb-4"
              compact
              currencyName={currencyName}
              maxVisibleRequests={4}
              showViewToggle={false}
              title="Shop Approvals"
            />

            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <SearchInput
                aria-label="Search students or groups"
                className="min-w-0 flex-1"
                id="teacherDashboardSearch"
                onChange={setSearch}
                placeholder="Search students or groups, or separate multiple searches with a semicolon"
                value={search}
              />
              <button
                className="inline-flex h-[46px] shrink-0 items-center justify-center gap-2 rounded-md border border-brand bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:border-button-border disabled:bg-panel-soft disabled:text-text-muted disabled:shadow-none"
                disabled={visibleStudents.length === 0}
                onClick={handleIssueAllShown}
                type="button"
              >
                <PlusIcon />
                <span>Issue all</span>
              </button>
            </div>

            {isDefaultingToCurrentClass && !currentClass && (
              <p className="text-sm text-text-muted">
                No class is timetabled right now. Search for students or groups.
              </p>
            )}

            {(visibleStudents.length > 0 || visibleGroups.length > 0) && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <CountChip
                  icon={<UsersIcon />}
                  label={`${visibleStudents.length} student${visibleStudents.length === 1 ? "" : "s"}`}
                />
                {visibleGroups.length > 0 && (
                  <CountChip
                    icon={<SparkleIcon />}
                    label={`${visibleGroups.length} group${visibleGroups.length === 1 ? "" : "s"}`}
                  />
                )}
              </div>
            )}

            {visibleStudents.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleStudents.map((student) => (
                  <StudentBalanceCard
                    currencyName={currencyName}
                    key={student.id}
                    onAdd={() =>
                      handleStudentsSelected([toStudentListItem(student)], "add")
                    }
                    onRemove={() =>
                      handleStudentsSelected(
                        [toStudentListItem(student)],
                        "remove",
                      )
                    }
                    student={student}
                  />
                ))}
              </div>
            )}

            {visibleGroups.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleGroups.map((group) => (
                  <GroupCreditCard
                    group={group}
                    key={group.id}
                    onAdd={() => handleGroupSelected(group, "add")}
                    onRemove={() => handleGroupSelected(group, "remove")}
                  />
                ))}
              </div>
            )}

            {visibleStudents.length === 0 &&
              visibleGroups.length === 0 &&
              !isDefaultingToCurrentClass && (
                <p className="text-sm text-text-muted">
                  No matching students or groups.
                </p>
              )}
          </div>
        )}
      </section>

      {selection && (
        <QuickAdjustmentModal
          currencyName={currencyName}
          onClose={() => setSelection(null)}
          selection={selection}
        />
      )}
    </>
  );
}

function CountChip({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-panel-soft px-2.5 py-1 text-xs font-semibold text-text-muted">
      {icon}
      {label}
    </span>
  );
}

function GroupCreditCard({
  group,
  onAdd,
  onRemove,
}: {
  group: GroupListItem;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="theme-card p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-accent">
          <UsersIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {group.name}
          </h3>
          <p className="mt-0.5 truncate text-xs font-medium text-text-muted">
            {group.memberCount} students
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className="rounded-md border border-success bg-success px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-success-hover"
          onClick={onAdd}
          type="button"
        >
          +
        </button>
        <button
          className="rounded-md border border-danger bg-danger px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
          onClick={onRemove}
          type="button"
        >
          -
        </button>
      </div>
    </article>
  );
}

function QuickAdjustmentModal({
  currencyName,
  onClose,
  selection,
}: {
  currencyName: string;
  onClose: () => void;
  selection: AdjustmentTargetSelection;
}) {
  const [error, setError] = useState<string | null>(null);

  function handleCreated() {
    onClose();
  }

  const targetName =
    selection.kind === "group"
      ? selection.group.name
      : `${selection.students.length} student${
          selection.students.length === 1 ? "" : "s"
        }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="theme-panel motion-pop max-h-[90vh] w-full max-w-xl overflow-y-auto p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold">
              {selection.direction === "add" ? "Add" : "Take"} {currencyName}
            </h3>
            <p className="mt-1 truncate text-sm text-text-muted">
              {targetName}
            </p>
          </div>
          <button
            className="rounded-md border border-button-border p-2 text-text-control transition hover:bg-panel-soft"
            onClick={onClose}
            type="button"
          >
            <XIcon />
          </button>
        </div>

        <LedgerAdjustmentForm
          currencyName={currencyName}
          onCreated={handleCreated}
          onError={setError}
          preferredDirection={selection.direction}
          preferredGroupId={
            selection.kind === "group" ? selection.group.id : undefined
          }
          preferredGroupSelectionVersion={selection.version}
          preferredStudents={
            selection.kind === "students" ? selection.students : undefined
          }
          preferredStudentSelectionVersion={selection.version}
        />

        {error && (
          <p className="mt-4 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function getVisibleStudents(
  search: string,
  currentClass: CurrentClass | null,
  studentBalances: StudentBalanceItem[],
) {
  const trimmedSearch = search.trim();

  if (!trimmedSearch) {
    return currentClass?.students ?? [];
  }

  const terms = splitSearchTerms(trimmedSearch);

  if (terms.length > 1) {
    return getStudentsMatchingAnyTerm(studentBalances, terms);
  }

  return getStudentsMatchingTerm(studentBalances, terms[0] ?? "");
}

function getVisibleGroups(search: string, groups: GroupListItem[]) {
  const trimmedSearch = search.trim();

  if (!trimmedSearch || hasSemicolonSearch(trimmedSearch)) {
    return [];
  }

  const query = normaliseSearchValue(trimmedSearch);

  return groups
    .filter((group) => normaliseSearchValue(group.name).includes(query))
    .slice(0, 8);
}

function getStudentsMatchingAnyTerm(
  students: StudentBalanceItem[],
  terms: string[],
) {
  const matchedStudents = new Map<string, StudentBalanceItem>();

  for (const term of terms) {
    for (const student of getStudentsMatchingTerm(students, term)) {
      matchedStudents.set(student.id, student);
    }
  }

  return Array.from(matchedStudents.values());
}

function getStudentsMatchingTerm(
  students: StudentBalanceItem[],
  term: string,
) {
  const query = normaliseSearchValue(term);

  if (!query) {
    return [];
  }

  return students
    .filter((student) =>
      [
        student.displayName,
        student.firstName,
        student.lastName,
        student.username,
        student.email,
      ].some((value) => normaliseSearchValue(value).includes(query)),
    )
    .slice(0, 12);
}

function splitSearchTerms(search: string) {
  return search
    .split(";")
    .map((term) => term.trim())
    .filter(Boolean);
}

function hasSemicolonSearch(search: string) {
  return search.includes(";");
}

function normaliseSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function toStudentListItem(
  student: CurrentClass["students"][number] | StudentBalanceItem,
): StudentListItem {
  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    displayName: student.displayName,
    profileImageUrl: student.profileImageUrl,
    username: student.username,
  };
}
