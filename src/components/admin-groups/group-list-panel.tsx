"use client";

import type { ReactNode } from "react";
import { CheckIcon, CopyIcon, EyeIcon, PencilIcon, XIcon } from "@/components/ui/icons";
import {
  ListPagination,
  usePagedList,
} from "@/components/ui/list-pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import {
  TableHeaderFilter,
  TableHeaderFilterInput,
  TableHeaderFilterSelect,
} from "@/components/ui/table-header-filter";
import type { GroupListItem } from "@/services/group-service";

type GroupListPanelProps = {
  groups: GroupListItem[];
  isLoading: boolean;
  onDuplicateGroup: (group: GroupListItem) => void;
  onEditGroup: (group: GroupListItem) => void;
  onGroupSelect: (group: GroupListItem) => void;
  onGroupStatusChange: (group: GroupListItem) => void;
  onSearchChange: (value: string) => void;
  onShowArchivedChange: (showArchived: boolean) => void;
  search: string;
  selectedGroupId: string;
  showArchived: boolean;
  toolbar?: ReactNode;
};

export function GroupListPanel({
  groups,
  isLoading,
  onDuplicateGroup,
  onEditGroup,
  onGroupSelect,
  onGroupStatusChange,
  onSearchChange,
  onShowArchivedChange,
  search,
  selectedGroupId,
  showArchived,
  toolbar,
}: GroupListPanelProps) {
  const {
    page,
    pageItems: visibleGroups,
    setPage,
    totalPages,
  } = usePagedList(groups);

  return (
    <div>
      <div>
        {isLoading && (
          <p className="text-sm text-text-muted">Loading groups...</p>
        )}
        {!isLoading && groups.length === 0 && (
          <p className="text-sm text-text-muted">No groups match these filters.</p>
        )}
        {!isLoading && groups.length > 0 && (
          <>
            <GroupList
              groups={visibleGroups}
              onDuplicateGroup={onDuplicateGroup}
              onEditGroup={onEditGroup}
              onGroupSelect={onGroupSelect}
              onGroupStatusChange={onGroupStatusChange}
              onSearchChange={onSearchChange}
              onShowArchivedChange={onShowArchivedChange}
              search={search}
              selectedGroupId={selectedGroupId}
              showArchived={showArchived}
              toolbar={toolbar}
            />
            <ListPagination
              onPageChange={setPage}
              page={page}
              totalCount={groups.length}
              totalPages={totalPages}
            />
          </>
        )}
      </div>
    </div>
  );
}

function GroupList({
  groups,
  onDuplicateGroup,
  onEditGroup,
  onGroupSelect,
  onGroupStatusChange,
  onSearchChange,
  onShowArchivedChange,
  search,
  selectedGroupId,
  showArchived,
  toolbar,
}: {
  groups: GroupListItem[];
  onDuplicateGroup: (group: GroupListItem) => void;
  onEditGroup: (group: GroupListItem) => void;
  onGroupSelect: (group: GroupListItem) => void;
  onGroupStatusChange: (group: GroupListItem) => void;
  onSearchChange: (value: string) => void;
  onShowArchivedChange: (showArchived: boolean) => void;
  search: string;
  selectedGroupId: string;
  showArchived: boolean;
  toolbar?: ReactNode;
}) {
  return (
    <>
      {toolbar && <div className="mb-3 md:hidden">{toolbar}</div>}
      <div className="grid gap-3 md:hidden">
        {groups.map((group) => (
          <GroupCard
            group={group}
            isSelected={selectedGroupId === group.id}
            key={group.id}
            onDuplicateGroup={onDuplicateGroup}
            onEditGroup={onEditGroup}
            onGroupSelect={onGroupSelect}
            onGroupStatusChange={onGroupStatusChange}
          />
        ))}
      </div>

      {toolbar && <div className="hidden md:block">{toolbar}</div>}
      <table className="hidden w-full border-collapse text-left text-sm md:table">
        <thead>
          <tr className="border-b border-border-subtle text-text-muted">
            <th className="py-2 pr-4 font-semibold">
              <TableHeaderFilter
                isActive={Boolean(search)}
                label="Name"
                onClear={() => onSearchChange("")}
              >
                <TableHeaderFilterInput
                  label="Search groups"
                  onChange={onSearchChange}
                  value={search}
                />
              </TableHeaderFilter>
            </th>
            <th className="py-2 pr-4 font-semibold">
              <TableHeaderFilter
                isActive={Boolean(search)}
                label="Description"
                onClear={() => onSearchChange("")}
              >
                <TableHeaderFilterInput
                  label="Search groups"
                  onChange={onSearchChange}
                  value={search}
                />
              </TableHeaderFilter>
            </th>
            <th className="py-2 pr-4 font-semibold">Members</th>
            <th className="py-2 pr-4 font-semibold">
              <TableHeaderFilter
                isActive={showArchived}
                label="Status"
                onClear={() => onShowArchivedChange(false)}
              >
                <TableHeaderFilterSelect
                  label="Status"
                  onChange={(value) =>
                    onShowArchivedChange(value === "includeArchived")
                  }
                  options={[
                    { label: "Active only", value: "activeOnly" },
                    { label: "Include archived", value: "includeArchived" },
                  ]}
                  value={showArchived ? "includeArchived" : "activeOnly"}
                />
              </TableHeaderFilter>
            </th>
            <th className="py-2 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr
              className={`border-b border-border-subtle ${
                selectedGroupId === group.id ? "bg-brand-soft" : ""
              }`}
              key={group.id}
            >
              <td className="py-3 pr-4 font-semibold">{group.name}</td>
              <td className="py-3 pr-4 text-text-muted">
                {group.description || "-"}
              </td>
              <td className="py-3 pr-4 text-text-muted">
                {group.memberCount}
              </td>
              <td className="py-3 pr-4">
                <GroupStatusBadge group={group} />
              </td>
              <td className="py-3">
                <GroupActions
                  group={group}
                  onDuplicateGroup={onDuplicateGroup}
                  onEditGroup={onEditGroup}
                  onGroupSelect={onGroupSelect}
                  onGroupStatusChange={onGroupStatusChange}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function GroupCard({
  group,
  isSelected,
  onDuplicateGroup,
  onEditGroup,
  onGroupSelect,
  onGroupStatusChange,
}: {
  group: GroupListItem;
  isSelected: boolean;
  onDuplicateGroup: (group: GroupListItem) => void;
  onEditGroup: (group: GroupListItem) => void;
  onGroupSelect: (group: GroupListItem) => void;
  onGroupStatusChange: (group: GroupListItem) => void;
}) {
  return (
    <article
      className={`rounded-md border p-3 ${
        isSelected
          ? "border-brand bg-brand-soft"
          : "border-border-subtle bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          className="min-w-0 flex-1 text-left"
          onClick={() => onGroupSelect(group)}
          type="button"
        >
          <h3 className="truncate text-sm font-semibold">{group.name}</h3>
          <p className="mt-1 truncate text-sm text-text-muted">
            {group.description || "No description"}
          </p>
        </button>
        <GroupActions
          group={group}
          onDuplicateGroup={onDuplicateGroup}
          onEditGroup={onEditGroup}
          onGroupSelect={onGroupSelect}
          onGroupStatusChange={onGroupStatusChange}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-text-muted">
        <span>{group.memberCount} members</span>
        <GroupStatusBadge group={group} />
      </div>
    </article>
  );
}

function GroupActions({
  group,
  onDuplicateGroup,
  onEditGroup,
  onGroupSelect,
  onGroupStatusChange,
}: {
  group: GroupListItem;
  onDuplicateGroup: (group: GroupListItem) => void;
  onEditGroup: (group: GroupListItem) => void;
  onGroupSelect: (group: GroupListItem) => void;
  onGroupStatusChange: (group: GroupListItem) => void;
}) {
  return (
    <TableActionMenu
      label={`Open actions for ${group.name}`}
      items={[
        {
          icon: <EyeIcon />,
          label: "View",
          onSelect: () => onGroupSelect(group),
        },
        {
          icon: <CopyIcon />,
          label: "Duplicate",
          onSelect: () => onDuplicateGroup(group),
        },
        {
          icon: <PencilIcon />,
          label: "Edit",
          onSelect: () => onEditGroup(group),
        },
        {
          icon: group.isActive ? <XIcon /> : <CheckIcon />,
          label: group.isActive ? "Archive" : "Reactivate",
          onSelect: () => onGroupStatusChange(group),
          tone: group.isActive ? "danger" : "primary",
        },
      ]}
    />
  );
}

function GroupStatusBadge({ group }: { group: GroupListItem }) {
  return (
    <StatusBadge
      label={group.isActive ? "Active" : "Archived"}
      tone={group.isActive ? "success" : "danger"}
    />
  );
}
