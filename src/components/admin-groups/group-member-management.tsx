import { IconButton } from "@/components/ui/icon-button";
import { TrashIcon } from "@/components/ui/icons";
import type {
  GroupListItem,
  GroupMemberItem,
} from "@/services/group-service";
import type { StudentListItem } from "@/services/user-service";

type GroupMemberManagementProps = {
  availableStudents: StudentListItem[];
  isLoadingMembers: boolean;
  isSearchingStudents: boolean;
  members: GroupMemberItem[];
  onAddSelectedStudents: () => void;
  onAddStudent: (student: StudentListItem) => void;
  onMemberSelectionToggle: (memberId: string) => void;
  onRemoveSelectedMembers: () => void;
  onRemoveStudent: (member: GroupMemberItem) => void;
  onStudentQueryChange: (value: string) => void;
  onStudentSelectionToggle: (studentId: string) => void;
  selectedGroup: GroupListItem;
  selectedMemberIds: string[];
  selectedStudentIds: string[];
  studentQuery: string;
};

export function GroupMemberManagement({
  availableStudents,
  isLoadingMembers,
  isSearchingStudents,
  members,
  onAddSelectedStudents,
  onAddStudent,
  onMemberSelectionToggle,
  onRemoveSelectedMembers,
  onRemoveStudent,
  onStudentQueryChange,
  onStudentSelectionToggle,
  selectedGroup,
  selectedMemberIds,
  selectedStudentIds,
  studentQuery,
}: GroupMemberManagementProps) {
  return (
    <div className="mt-5 border-t border-border-subtle pt-5">
      <GroupStudentSearch
        availableStudents={availableStudents}
        isSearching={isSearchingStudents}
        onAddSelectedStudents={onAddSelectedStudents}
        onAddStudent={onAddStudent}
        onQueryChange={onStudentQueryChange}
        onStudentSelectionToggle={onStudentSelectionToggle}
        selectedGroup={selectedGroup}
        selectedStudentIds={selectedStudentIds}
        studentQuery={studentQuery}
      />

      <GroupMembersTable
        isLoading={isLoadingMembers}
        members={members}
        onMemberSelectionToggle={onMemberSelectionToggle}
        onRemoveSelectedMembers={onRemoveSelectedMembers}
        onRemoveStudent={onRemoveStudent}
        selectedMemberIds={selectedMemberIds}
      />
    </div>
  );
}

function GroupStudentSearch({
  availableStudents,
  isSearching,
  onAddSelectedStudents,
  onAddStudent,
  onQueryChange,
  onStudentSelectionToggle,
  selectedGroup,
  selectedStudentIds,
  studentQuery,
}: {
  availableStudents: StudentListItem[];
  isSearching: boolean;
  onAddSelectedStudents: () => void;
  onAddStudent: (student: StudentListItem) => void;
  onQueryChange: (value: string) => void;
  onStudentSelectionToggle: (studentId: string) => void;
  selectedGroup: GroupListItem;
  selectedStudentIds: string[];
  studentQuery: string;
}) {
  return (
    <div className={selectedGroup.isActive ? "" : "opacity-60"}>
      <label
        className="text-sm font-semibold text-text-control"
        htmlFor="studentSearch"
      >
        Add student
      </label>
      <input
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        disabled={!selectedGroup.isActive}
        id="studentSearch"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search by name or username"
        value={studentQuery}
      />
      {isSearching && (
        <p className="mt-2 text-sm text-text-muted">Searching...</p>
      )}
      {availableStudents.length > 0 && studentQuery && (
        <StudentSearchResults
          onAddStudent={onAddStudent}
          onStudentSelectionToggle={onStudentSelectionToggle}
          selectedGroup={selectedGroup}
          selectedStudentIds={selectedStudentIds}
          students={availableStudents}
        />
      )}
      {selectedStudentIds.length > 0 && selectedGroup.isActive && (
        <button
          className="mt-3 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
          onClick={onAddSelectedStudents}
          type="button"
        >
          Add Selected ({selectedStudentIds.length})
        </button>
      )}
    </div>
  );
}

function StudentSearchResults({
  onAddStudent,
  onStudentSelectionToggle,
  selectedGroup,
  selectedStudentIds,
  students,
}: {
  onAddStudent: (student: StudentListItem) => void;
  onStudentSelectionToggle: (studentId: string) => void;
  selectedGroup: GroupListItem;
  selectedStudentIds: string[];
  students: StudentListItem[];
}) {
  return (
    <div className="mt-2 overflow-hidden rounded-md border border-border-subtle bg-surface">
      {students.map((student) => (
        <div
          className="flex w-full items-center justify-between gap-3 border-b border-border-subtle px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-panel-soft"
          key={student.id}
        >
          <label className="flex min-w-0 items-center gap-2">
            <input
              checked={selectedStudentIds.includes(student.id)}
              className="h-4 w-4"
              disabled={!selectedGroup.isActive}
              onChange={() => onStudentSelectionToggle(student.id)}
              type="checkbox"
            />
            <span className="min-w-0">
              <span className="block truncate font-semibold text-text-control">
                {student.displayName}
              </span>
              <span className="block truncate text-xs text-text-muted">
                {student.username}
              </span>
            </span>
          </label>
          <button
            className="rounded-md border border-button-border px-2 py-1 text-xs font-semibold text-text-control transition hover:bg-panel-soft"
            disabled={!selectedGroup.isActive}
            onClick={() => onAddStudent(student)}
            type="button"
          >
            Add
          </button>
        </div>
      ))}
    </div>
  );
}

function GroupMembersTable({
  isLoading,
  members,
  onMemberSelectionToggle,
  onRemoveSelectedMembers,
  onRemoveStudent,
  selectedMemberIds,
}: {
  isLoading: boolean;
  members: GroupMemberItem[];
  onMemberSelectionToggle: (memberId: string) => void;
  onRemoveSelectedMembers: () => void;
  onRemoveStudent: (member: GroupMemberItem) => void;
  selectedMemberIds: string[];
}) {
  return (
    <div className="mt-5">
      {isLoading && (
        <p className="text-sm text-text-muted">Loading members...</p>
      )}
      {!isLoading && members.length === 0 && (
        <p className="text-sm text-text-muted">
          No students have been added to this group.
        </p>
      )}
      {!isLoading && members.length > 0 && (
        <>
          <div className="grid gap-2 md:hidden">
            {members.map((member) => (
              <MemberCard
                isSelected={selectedMemberIds.includes(member.id)}
                key={member.id}
                member={member}
                onRemoveStudent={onRemoveStudent}
                onSelectionToggle={onMemberSelectionToggle}
              />
            ))}
          </div>

          <table className="hidden w-full text-left text-sm md:table">
            <thead className="text-text-muted">
              <tr className="border-b border-border-subtle">
                <th className="py-2 pr-4 font-semibold">Select</th>
                <th className="py-2 pr-4 font-semibold">Name</th>
                <th className="py-2 pr-4 font-semibold">Username</th>
                <th className="py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr className="border-b border-border-subtle" key={member.id}>
                  <td className="py-2 pr-4">
                    <input
                      checked={selectedMemberIds.includes(member.id)}
                      className="h-4 w-4"
                      onChange={() => onMemberSelectionToggle(member.id)}
                      type="checkbox"
                    />
                  </td>
                  <td className="py-2 pr-4 font-semibold">
                    {member.displayName}
                  </td>
                  <td className="py-2 pr-4 text-text-muted">
                    {member.username}
                  </td>
                  <td className="py-2">
                    <IconButton
                      label={`Remove ${member.displayName}`}
                      onClick={() => onRemoveStudent(member)}
                      tone="danger"
                    >
                      <TrashIcon />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {selectedMemberIds.length > 0 && (
        <button
          className="mt-3 rounded-md border border-danger-button-border px-4 py-2 text-sm font-semibold text-danger-strong transition hover:bg-danger-soft"
          onClick={onRemoveSelectedMembers}
          type="button"
        >
          Remove Selected ({selectedMemberIds.length})
        </button>
      )}
    </div>
  );
}

function MemberCard({
  isSelected,
  member,
  onRemoveStudent,
  onSelectionToggle,
}: {
  isSelected: boolean;
  member: GroupMemberItem;
  onRemoveStudent: (member: GroupMemberItem) => void;
  onSelectionToggle: (memberId: string) => void;
}) {
  return (
    <article className="rounded-md border border-border-subtle bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <label className="flex min-w-0 items-start gap-3">
          <input
            checked={isSelected}
            className="mt-1 h-4 w-4"
            onChange={() => onSelectionToggle(member.id)}
            type="checkbox"
          />
          <span className="min-w-0">
            <span className="block truncate font-semibold">
              {member.displayName}
            </span>
            <span className="block truncate text-sm text-text-muted">
              {member.username}
            </span>
          </span>
        </label>
        <IconButton
          label={`Remove ${member.displayName}`}
          onClick={() => onRemoveStudent(member)}
          tone="danger"
        >
          <TrashIcon />
        </IconButton>
      </div>
    </article>
  );
}
