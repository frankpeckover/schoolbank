"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addStudentToGroup,
  addStudentsToGroup,
  listGroupMembers,
  listGroups,
  removeStudentFromGroup,
  removeStudentsFromGroup,
  searchStudents,
  setGroupActive,
} from "@/lib/actions";
import { GroupDetailsPanel } from "@/components/admin-groups/group-details-panel";
import { GroupEditModal } from "@/components/admin-groups/group-edit-modal";
import { GroupImportModal } from "@/components/admin-groups/group-import-modal";
import { GroupListPanel } from "@/components/admin-groups/group-list-panel";
import { GroupModal } from "@/components/admin-groups/group-modal";
import { GroupsPageHeader } from "@/components/admin-groups/groups-page-header";
import { AdminPageSection } from "@/components/ui/admin-page-section";
import { downloadCsv } from "@/lib/client-csv";
import { formatDateTime } from "@/lib/formatters";
import type {
  GroupListItem,
  GroupMemberItem,
} from "@/services/group-service";
import type { StudentListItem } from "@/services/user-service";

const studentSearchDebounceMs = 250;
const emptyStudents: StudentListItem[] = [];

export function AdminGroupsPanel() {
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [members, setMembers] = useState<GroupMemberItem[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] =
    useState<StudentListItem[]>(emptyStudents);
  const [showInactiveGroups, setShowInactiveGroups] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [duplicatingGroup, setDuplicatingGroup] =
    useState<GroupListItem | null>(null);
  const [editingGroup, setEditingGroup] = useState<GroupListItem | null>(null);
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );
  const memberIds = useMemo(
    () => new Set(members.map((member) => member.id)),
    [members],
  );
  const availableStudentResults = studentResults.filter(
    (student) => !memberIds.has(student.id),
  );
  const filteredGroups = groups.filter((group) =>
    matchesGroupSearch(group, groupSearch),
  );

  useEffect(() => {
    let isActive = true;

    async function loadGroups() {
      setIsLoadingGroups(true);

      try {
        const loadedGroups = await listGroups(showInactiveGroups);

        if (isActive) {
          setGroups(loadedGroups);
          setSelectedGroupId((currentGroupId) =>
            loadedGroups.some((group) => group.id === currentGroupId)
              ? currentGroupId
              : "",
          );
          if (loadedGroups.length === 0) {
            setMembers([]);
          }
          setError(null);
        }
      } catch {
        if (isActive) {
          setError("Could not load groups.");
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
  }, [showInactiveGroups]);

  useEffect(() => {
    if (!selectedGroupId) {
      return;
    }

    refreshMembers(selectedGroupId);
  }, [selectedGroupId]);

  useEffect(() => {
    let isActive = true;
    const timeoutId = window.setTimeout(async () => {
      setIsSearchingStudents(true);

      try {
        const students = await searchStudents(studentQuery);

        if (isActive) {
          setStudentResults(students);
          setError(null);
        }
      } catch {
        if (isActive) {
          setStudentResults(emptyStudents);
          setError("Could not search students.");
        }
      } finally {
        if (isActive) {
          setIsSearchingStudents(false);
        }
      }
    }, studentSearchDebounceMs);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [studentQuery]);

  async function refreshGroups() {
    setIsLoadingGroups(true);

    try {
      const loadedGroups = await listGroups(showInactiveGroups);

      setGroups(loadedGroups);
      setSelectedGroupId((currentGroupId) =>
        loadedGroups.some((group) => group.id === currentGroupId)
          ? currentGroupId
          : "",
      );
      if (loadedGroups.length === 0) {
        setMembers([]);
      }
      setError(null);
    } catch {
      setError("Could not load groups.");
    } finally {
      setIsLoadingGroups(false);
    }
  }

  async function refreshMembers(groupId: string) {
    setIsLoadingMembers(true);

    try {
      const loadedMembers = await listGroupMembers(groupId);

      setMembers(loadedMembers);
      setSelectedMemberIds([]);
      setError(null);
    } catch {
      setError("Could not load group members.");
    } finally {
      setIsLoadingMembers(false);
    }
  }

  async function handleGroupCreated() {
    setDuplicatingGroup(null);
    setIsCreateModalOpen(false);
    setMessage("Group created.");
    setError(null);
    await refreshGroups();
  }

  async function handleGroupsImported(messageText: string, shouldClose = true) {
    setMessage(messageText);
    setError(null);

    if (shouldClose) {
      setIsImportModalOpen(false);
    }

    await refreshGroups();
    if (selectedGroupId) {
      await refreshMembers(selectedGroupId);
    }
  }

  async function handleGroupUpdated() {
    setEditingGroup(null);
    closeGroupDetails();
    setMessage("Group updated.");
    setError(null);
    await refreshGroups();
  }
  
  async function handleAddStudent(student: StudentListItem) {
    if (!selectedGroupId) {
      setError("Select a group first.");
      return;
    }

    const result = await addStudentToGroup(selectedGroupId, student.id);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(`${student.displayName} added to ${selectedGroup?.name ?? "group"}.`);
    setError(null);
    setSelectedStudentIds([]);
    setStudentQuery("");
    await refreshMembers(selectedGroupId);
    await refreshGroups();
  }

  async function handleAddSelectedStudents() {
    if (!selectedGroupId || selectedStudentIds.length === 0) {
      setError("Select a group and at least one student.");
      return;
    }

    const result = await addStudentsToGroup({
      groupId: selectedGroupId,
      userIds: selectedStudentIds,
    });

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(`${selectedStudentIds.length} students added to ${selectedGroup?.name ?? "group"}.`);
    setError(null);
    setSelectedStudentIds([]);
    setStudentQuery("");
    await refreshMembers(selectedGroupId);
    await refreshGroups();
  }

  async function handleRemoveStudent(member: GroupMemberItem) {
    if (!selectedGroupId) {
      return;
    }

    const result = await removeStudentFromGroup(selectedGroupId, member.id);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(`${member.displayName} removed from ${selectedGroup?.name ?? "group"}.`);
    setError(null);
    await refreshMembers(selectedGroupId);
    await refreshGroups();
  }

  async function handleRemoveSelectedMembers() {
    if (!selectedGroupId || selectedMemberIds.length === 0) {
      setError("Select at least one group member.");
      return;
    }

    const result = await removeStudentsFromGroup({
      groupId: selectedGroupId,
      userIds: selectedMemberIds,
    });

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(`${selectedMemberIds.length} students removed from ${selectedGroup?.name ?? "group"}.`);
    setError(null);
    setSelectedMemberIds([]);
    await refreshMembers(selectedGroupId);
    await refreshGroups();
  }

  async function handleGroupStatusChange() {
    if (!selectedGroup) {
      return;
    }

    const nextActiveState = !selectedGroup.isActive;
    const result = await setGroupActive(selectedGroup.id, nextActiveState);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(nextActiveState ? "Group reactivated." : "Group archived.");
    setError(null);
    if (!nextActiveState && !showInactiveGroups) {
      setEditingGroup(null);
      setSelectedGroupId("");
      setMembers([]);
    }
    await refreshGroups();
  }

  function toggleSelectedStudent(studentId: string) {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  }

  function toggleSelectedMember(memberId: string) {
    setSelectedMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  }

  function selectGroup(group: GroupListItem) {
    setMembers([]);
    setSelectedMemberIds([]);
    setSelectedStudentIds([]);
    setDuplicatingGroup(null);
    setEditingGroup(null);
    setSelectedGroupId(group.id);
  }

  function editGroup(group: GroupListItem) {
    setMembers([]);
    setSelectedMemberIds([]);
    setSelectedStudentIds([]);
    setStudentQuery("");
    setDuplicatingGroup(null);
    setEditingGroup(group);
    setSelectedGroupId(group.id);
  }

  function duplicateGroup(group: GroupListItem) {
    setMembers([]);
    setSelectedMemberIds([]);
    setSelectedStudentIds([]);
    setStudentQuery("");
    setEditingGroup(null);
    setSelectedGroupId("");
    setDuplicatingGroup(group);
    setIsCreateModalOpen(true);
  }

  function closeGroupDetails() {
    setSelectedGroupId("");
    setMembers([]);
    setSelectedMemberIds([]);
    setSelectedStudentIds([]);
    setStudentQuery("");
  }

  function closeGroupEdit() {
    setEditingGroup(null);
    closeGroupDetails();
  }

  function handleShowInactiveGroupsChange(showInactive: boolean) {
    setMembers([]);
    setSelectedGroupId("");
    setSelectedMemberIds([]);
    setSelectedStudentIds([]);
    setShowInactiveGroups(showInactive);
  }

  function handleStudentQueryChange(value: string) {
    setSelectedStudentIds([]);
    setStudentQuery(value);
  }

  return (
    <AdminPageSection>
      <GroupsPageHeader
        areFiltersOpen={areFiltersOpen}
        count={filteredGroups.length}
        onExportClick={() => downloadGroups(filteredGroups)}
        onFilterToggle={() => setAreFiltersOpen((isOpen) => !isOpen)}
        onImportClick={() => setIsImportModalOpen(true)}
        onNewGroupClick={() => {
          setDuplicatingGroup(null);
          setIsCreateModalOpen(true);
        }}
        totalCount={groups.length}
      />

      <GroupListPanel
        areFiltersOpen={areFiltersOpen}
        groups={filteredGroups}
        isLoading={isLoadingGroups}
        onDuplicateGroup={duplicateGroup}
        onEditGroup={editGroup}
        onGroupSelect={selectGroup}
        onSearchChange={setGroupSearch}
        onShowArchivedChange={handleShowInactiveGroupsChange}
        search={groupSearch}
        selectedGroupId={selectedGroupId}
        showArchived={showInactiveGroups}
      />

      {selectedGroup && !editingGroup && (
        <GroupDetailsPanel
          isLoadingMembers={isLoadingMembers}
          members={members}
          onClose={closeGroupDetails}
          selectedGroup={selectedGroup}
        />
      )}

      {message && (
        <p className="mt-4 rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-semibold text-success">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
          {error}
        </p>
      )}

      {isCreateModalOpen && (
        <GroupModal
          initialDescription={duplicatingGroup?.description ?? ""}
          initialName={
            duplicatingGroup ? `${duplicatingGroup.name} Copy` : ""
          }
          onClose={() => {
            setDuplicatingGroup(null);
            setIsCreateModalOpen(false);
          }}
          onSaved={handleGroupCreated}
        />
      )}

      {editingGroup && selectedGroup && (
        <GroupEditModal
          availableStudents={availableStudentResults}
          group={selectedGroup}
          isLoadingMembers={isLoadingMembers}
          isSearchingStudents={isSearchingStudents}
          members={members}
          onAddSelectedStudents={handleAddSelectedStudents}
          onAddStudent={handleAddStudent}
          onClose={closeGroupEdit}
          onGroupStatusChange={handleGroupStatusChange}
          onMemberSelectionToggle={toggleSelectedMember}
          onRemoveSelectedMembers={handleRemoveSelectedMembers}
          onRemoveStudent={handleRemoveStudent}
          onSaved={handleGroupUpdated}
          onStudentQueryChange={handleStudentQueryChange}
          onStudentSelectionToggle={toggleSelectedStudent}
          selectedMemberIds={selectedMemberIds}
          selectedStudentIds={selectedStudentIds}
          studentQuery={studentQuery}
        />
      )}

      {isImportModalOpen && (
        <GroupImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImportCompleted={refreshGroups}
          onImported={handleGroupsImported}
        />
      )}
    </AdminPageSection>
  );
}

function matchesGroupSearch(group: GroupListItem, search: string) {
  const query = search.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return `${group.name} ${group.description}`.toLowerCase().includes(query);
}

function downloadGroups(groups: GroupListItem[]) {
  downloadCsv(
    "groups.csv",
    [
      "id",
      "name",
      "description",
      "member_count",
      "status",
      "created_at",
    ],
    groups.map((group) => [
      group.id,
      group.name,
      group.description,
      group.memberCount,
      group.isActive ? "active" : "archived",
      formatDateTime(group.createdAt),
    ]),
  );
}
