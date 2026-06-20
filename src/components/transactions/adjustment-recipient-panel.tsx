import type {
  AdjustmentTarget,
} from "@/components/transactions/ledger-adjustment-types";
import type { GroupListItem } from "@/services/group-service";
import type { StudentListItem } from "@/services/user-service";

type AdjustmentRecipientPanelProps = {
  groups: GroupListItem[];
  isLoadingGroups: boolean;
  isSearching: boolean;
  onGroupChange: (groupId: string) => void;
  onStudentQueryChange: (value: string) => void;
  onStudentSelect: (student: StudentListItem) => void;
  onTargetChange: (target: AdjustmentTarget) => void;
  recentStudents: StudentListItem[];
  selectedGroup: GroupListItem | null;
  selectedGroupId: string;
  selectedStudent: StudentListItem | null;
  studentQuery: string;
  studentResults: StudentListItem[];
  target: AdjustmentTarget;
};

export function AdjustmentRecipientPanel({
  groups,
  isLoadingGroups,
  isSearching,
  onGroupChange,
  onStudentQueryChange,
  onStudentSelect,
  onTargetChange,
  recentStudents,
  selectedGroup,
  selectedGroupId,
  selectedStudent,
  studentQuery,
  studentResults,
  target,
}: AdjustmentRecipientPanelProps) {
  return (
    <section className="rounded-md border border-border-subtle bg-surface p-3">
      <TargetToggle onChange={onTargetChange} target={target} />

      <RecipientHeading
        isLoadingGroups={isLoadingGroups}
        isSearching={isSearching}
        target={target}
      />

      {target === "student" ? (
        <StudentSelector
          isSearching={isSearching}
          onQueryChange={onStudentQueryChange}
          onStudentSelect={onStudentSelect}
          recentStudents={recentStudents}
          selectedStudent={selectedStudent}
          studentQuery={studentQuery}
          studentResults={studentResults}
        />
      ) : (
        <GroupSelector
          groups={groups}
          onChange={onGroupChange}
          selectedGroup={selectedGroup}
          selectedGroupId={selectedGroupId}
        />
      )}
    </section>
  );
}

function RecipientHeading({
  isLoadingGroups,
  isSearching,
  target,
}: {
  isLoadingGroups: boolean;
  isSearching: boolean;
  target: AdjustmentTarget;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold">
          {target === "student" ? "Student" : "Group"}
        </h3>
        <p className="text-sm text-text-muted">
          {target === "student"
            ? "Search by name or username."
            : "Apply the same transaction to every active student."}
        </p>
      </div>
      {target === "student" && isSearching && (
        <span className="text-xs font-semibold text-text-muted">
          Searching...
        </span>
      )}
      {target === "group" && isLoadingGroups && (
        <span className="text-xs font-semibold text-text-muted">
          Loading...
        </span>
      )}
    </div>
  );
}

function TargetToggle({
  onChange,
  target,
}: {
  onChange: (target: AdjustmentTarget) => void;
  target: AdjustmentTarget;
}) {
  return (
    <div className="mb-4">
      <p className="text-sm font-semibold text-text-control">Recipient</p>
      <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-md border border-button-border">
        <button
          className={`px-4 py-3 text-sm font-semibold transition ${
            target === "student"
              ? "bg-brand text-white"
              : "bg-surface text-text-control hover:bg-panel-soft"
          }`}
          onClick={() => onChange("student")}
          type="button"
        >
          Student
        </button>
        <button
          className={`px-4 py-3 text-sm font-semibold transition ${
            target === "group"
              ? "bg-brand text-white"
              : "bg-surface text-text-control hover:bg-panel-soft"
          }`}
          onClick={() => onChange("group")}
          type="button"
        >
          Group
        </button>
      </div>
    </div>
  );
}

function StudentSelector({
  isSearching,
  onQueryChange,
  onStudentSelect,
  recentStudents,
  selectedStudent,
  studentQuery,
  studentResults,
}: {
  isSearching: boolean;
  onQueryChange: (value: string) => void;
  onStudentSelect: (student: StudentListItem) => void;
  recentStudents: StudentListItem[];
  selectedStudent: StudentListItem | null;
  studentQuery: string;
  studentResults: StudentListItem[];
}) {
  return (
    <>
      <input
        className="mt-3 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Start typing a student name"
        value={studentQuery}
      />

      {selectedStudent && <SelectedStudentCard student={selectedStudent} />}

      {!selectedStudent && studentResults.length > 0 && (
        <StudentResultList onSelect={onStudentSelect} students={studentResults} />
      )}

      {!selectedStudent && studentResults.length === 0 && studentQuery && !isSearching && (
        <p className="mt-3 rounded-md border border-border-subtle bg-panel-soft px-3 py-2 text-sm text-text-muted">
          No students found.
        </p>
      )}

      {recentStudents.length > 0 && (
        <RecentStudentList
          onSelect={onStudentSelect}
          students={recentStudents}
        />
      )}
    </>
  );
}

function GroupSelector({
  groups,
  onChange,
  selectedGroup,
  selectedGroupId,
}: {
  groups: GroupListItem[];
  onChange: (groupId: string) => void;
  selectedGroup: GroupListItem | null;
  selectedGroupId: string;
}) {
  if (groups.length === 0) {
    return (
      <p className="mt-3 rounded-md border border-border-subtle bg-panel-soft px-3 py-2 text-sm text-text-muted">
        No active groups are available.
      </p>
    );
  }

  return (
    <>
      <label
        className="mt-3 block text-sm font-semibold text-text-control"
        htmlFor="group"
      >
        Group
      </label>
      <select
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id="group"
        onChange={(event) => onChange(event.target.value)}
        value={selectedGroupId}
      >
        <option value="">Select a group</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name} ({group.memberCount} members)
          </option>
        ))}
      </select>

      {selectedGroup && (
        <div className="mt-3 rounded-md border border-success-border bg-success-soft px-3 py-2">
          <p className="text-sm font-semibold text-success">
            {selectedGroup.name}
          </p>
          <p className="text-xs text-success">
            {selectedGroup.memberCount} active members will receive this transaction.
          </p>
        </div>
      )}
    </>
  );
}

function SelectedStudentCard({ student }: { student: StudentListItem }) {
  return (
    <div className="mt-3 rounded-md border border-success-border bg-success-soft px-3 py-2">
      <p className="text-sm font-semibold text-success">{student.displayName}</p>
      <p className="text-xs text-success">{student.username}</p>
    </div>
  );
}

function StudentResultList({
  onSelect,
  students,
}: {
  onSelect: (student: StudentListItem) => void;
  students: StudentListItem[];
}) {
  return (
    <div className="mt-3 overflow-hidden rounded-md border border-border-subtle">
      {students.map((student) => (
        <button
          className="flex w-full items-center justify-between gap-3 border-b border-border-subtle px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-panel-soft"
          key={student.id}
          onClick={() => onSelect(student)}
          type="button"
        >
          <span className="font-semibold text-text-control">
            {student.displayName}
          </span>
          <span className="text-text-muted">{student.username}</span>
        </button>
      ))}
    </div>
  );
}

function RecentStudentList({
  onSelect,
  students,
}: {
  onSelect: (student: StudentListItem) => void;
  students: StudentListItem[];
}) {
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-text-control">Recent</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {students.map((student) => (
          <button
            className="rounded-md border border-button-border px-3 py-2 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
            key={student.id}
            onClick={() => onSelect(student)}
            type="button"
          >
            {student.displayName}
          </button>
        ))}
      </div>
    </div>
  );
}
