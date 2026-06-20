"use client";

import { useState, type FormEvent } from "react";
import { updateGroup } from "@/lib/actions";
import { GroupMemberManagement } from "@/components/admin-groups/group-member-management";
import type {
  GroupListItem,
  GroupMemberItem,
} from "@/services/group-service";
import type { StudentListItem } from "@/services/user-service";

type GroupEditModalProps = {
  availableStudents: StudentListItem[];
  group: GroupListItem;
  isLoadingMembers: boolean;
  isSearchingStudents: boolean;
  members: GroupMemberItem[];
  onAddSelectedStudents: () => void;
  onAddStudent: (student: StudentListItem) => void;
  onClose: () => void;
  onGroupStatusChange: () => void;
  onMemberSelectionToggle: (memberId: string) => void;
  onRemoveSelectedMembers: () => void;
  onRemoveStudent: (member: GroupMemberItem) => void;
  onSaved: () => void;
  onStudentQueryChange: (value: string) => void;
  onStudentSelectionToggle: (studentId: string) => void;
  selectedMemberIds: string[];
  selectedStudentIds: string[];
  studentQuery: string;
};

export function GroupEditModal({
  availableStudents,
  group,
  isLoadingMembers,
  isSearchingStudents,
  members,
  onAddSelectedStudents,
  onAddStudent,
  onClose,
  onGroupStatusChange,
  onMemberSelectionToggle,
  onRemoveSelectedMembers,
  onRemoveStudent,
  onSaved,
  onStudentQueryChange,
  onStudentSelectionToggle,
  selectedMemberIds,
  selectedStudentIds,
  studentQuery,
}: GroupEditModalProps) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const result = await updateGroup({
      description,
      id: group.id,
      name,
    });

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="motion-pop max-h-full w-full max-w-4xl overflow-y-auto rounded-md border border-border bg-surface p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold">Edit Group</h3>
            <p className="mt-1 text-sm text-text-muted">
              Update group details, status, and student membership.
            </p>
          </div>
          <button
            className="rounded-md border border-button-border px-3 py-2 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <TextField
            id="editGroupName"
            label="Group Name"
            onChange={setName}
            value={name}
          />
          <TextField
            id="editGroupDescription"
            label="Description"
            onChange={setDescription}
            value={description}
          />

          {error && (
            <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              className="rounded-md border border-button-border px-4 py-3 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Saving..." : "Save Group"}
            </button>
          </div>
        </form>

        <GroupStatusControl group={group} onStatusChange={onGroupStatusChange} />

        <GroupMemberManagement
          availableStudents={availableStudents}
          isLoadingMembers={isLoadingMembers}
          isSearchingStudents={isSearchingStudents}
          members={members}
          onAddSelectedStudents={onAddSelectedStudents}
          onAddStudent={onAddStudent}
          onMemberSelectionToggle={onMemberSelectionToggle}
          onRemoveSelectedMembers={onRemoveSelectedMembers}
          onRemoveStudent={onRemoveStudent}
          onStudentQueryChange={onStudentQueryChange}
          onStudentSelectionToggle={onStudentSelectionToggle}
          selectedGroup={group}
          selectedMemberIds={selectedMemberIds}
          selectedStudentIds={selectedStudentIds}
          studentQuery={studentQuery}
        />
      </div>
    </div>
  );
}

function GroupStatusControl({
  group,
  onStatusChange,
}: {
  group: GroupListItem;
  onStatusChange: () => void;
}) {
  return (
    <div className="mt-5 rounded-md border border-border-subtle bg-panel-soft p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-text-control">Status</p>
          <p className="mt-1 text-sm text-text-muted">
            {group.isActive
              ? "This group is active and can be used."
              : "This group is archived and hidden by default."}
          </p>
        </div>
        <button
          className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
            group.isActive
              ? "border-danger-button-border text-danger-strong hover:bg-danger-soft"
              : "border-button-border text-text-control hover:bg-surface"
          }`}
          onClick={onStatusChange}
          type="button"
        >
          {group.isActive ? "Archive" : "Reactivate"}
        </button>
      </div>
    </div>
  );
}

function TextField({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-text-control" htmlFor={id}>
        {label}
      </label>
      <input
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </div>
  );
}
