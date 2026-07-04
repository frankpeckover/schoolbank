import { IconButton } from "@/components/ui/icon-button";
import { EyeIcon, PencilIcon } from "@/components/ui/icons";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import type { GroupListItem } from "@/services/group-service";

type GroupListPanelProps = {
  areFiltersOpen: boolean;
  groups: GroupListItem[];
  isLoading: boolean;
  onEditGroup: (group: GroupListItem) => void;
  onGroupSelect: (group: GroupListItem) => void;
  onSearchChange: (value: string) => void;
  onShowArchivedChange: (showArchived: boolean) => void;
  search: string;
  selectedGroupId: string;
  showArchived: boolean;
};

export function GroupListPanel({
  areFiltersOpen,
  groups,
  isLoading,
  onEditGroup,
  onGroupSelect,
  onSearchChange,
  onShowArchivedChange,
  search,
  selectedGroupId,
  showArchived,
}: GroupListPanelProps) {
  return (
    <div className="mt-5">
      {areFiltersOpen && (
        <GroupFilters
          onSearchChange={onSearchChange}
          onShowArchivedChange={onShowArchivedChange}
          search={search}
          showArchived={showArchived}
        />
      )}

      <div className={areFiltersOpen ? "mt-5" : ""}>
        {isLoading && (
          <p className="text-sm text-text-muted">Loading groups...</p>
        )}
        {!isLoading && groups.length === 0 && (
          <p className="text-sm text-text-muted">No groups match these filters.</p>
        )}
        {!isLoading && groups.length > 0 && (
          <GroupList
            groups={groups}
            onEditGroup={onEditGroup}
            onGroupSelect={onGroupSelect}
            selectedGroupId={selectedGroupId}
          />
        )}
      </div>
    </div>
  );
}

function GroupFilters({
  onSearchChange,
  onShowArchivedChange,
  search,
  showArchived,
}: {
  onSearchChange: (value: string) => void;
  onShowArchivedChange: (showArchived: boolean) => void;
  search: string;
  showArchived: boolean;
}) {
  return (
    <div className="theme-subpanel p-4">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <label className="text-sm font-semibold text-text-control" htmlFor="groupSearch">
            Search groups
          </label>
          <SearchInput
            className="mt-2"
            id="groupSearch"
            onChange={onSearchChange}
            placeholder="Search by group name or description"
            value={search}
          />
        </div>
        <label className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface px-3 py-3 text-sm font-semibold text-text-control">
          <input
            checked={showArchived}
            className="h-4 w-4"
            onChange={(event) => onShowArchivedChange(event.target.checked)}
            type="checkbox"
          />
          Show archived
        </label>
      </div>
    </div>
  );
}

function GroupList({
  groups,
  onEditGroup,
  onGroupSelect,
  selectedGroupId,
}: {
  groups: GroupListItem[];
  onEditGroup: (group: GroupListItem) => void;
  onGroupSelect: (group: GroupListItem) => void;
  selectedGroupId: string;
}) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {groups.map((group) => (
          <GroupCard
            group={group}
            isSelected={selectedGroupId === group.id}
            key={group.id}
            onEditGroup={onEditGroup}
            onGroupSelect={onGroupSelect}
          />
        ))}
      </div>

      <table className="hidden w-full border-collapse text-left text-sm md:table">
        <thead>
          <tr className="border-b border-border-subtle text-text-muted">
            <th className="py-2 pr-4 font-semibold">Name</th>
            <th className="py-2 pr-4 font-semibold">Description</th>
            <th className="py-2 pr-4 font-semibold">Members</th>
            <th className="py-2 pr-4 font-semibold">Status</th>
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
                <div className="flex gap-2">
                  <IconButton label={`View ${group.name}`} onClick={() => onGroupSelect(group)}>
                    <EyeIcon />
                  </IconButton>
                  <IconButton label={`Edit ${group.name}`} onClick={() => onEditGroup(group)}>
                    <PencilIcon />
                  </IconButton>
                </div>
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
  onEditGroup,
  onGroupSelect,
}: {
  group: GroupListItem;
  isSelected: boolean;
  onEditGroup: (group: GroupListItem) => void;
  onGroupSelect: (group: GroupListItem) => void;
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
        <IconButton label={`View ${group.name}`} onClick={() => onGroupSelect(group)}>
          <EyeIcon />
        </IconButton>
        <IconButton label={`Edit ${group.name}`} onClick={() => onEditGroup(group)}>
          <PencilIcon />
        </IconButton>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-text-muted">
        <span>{group.memberCount} members</span>
        <GroupStatusBadge group={group} />
      </div>
    </article>
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
