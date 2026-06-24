import { IconButton } from "@/components/ui/icon-button";
import { FileUpIcon, FilterIcon, PlusIcon, UsersIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";

type GroupsPageHeaderProps = {
  areFiltersOpen: boolean;
  onFilterToggle: () => void;
  onImportClick: () => void;
  onNewGroupClick: () => void;
};

export function GroupsPageHeader({
  areFiltersOpen,
  onFilterToggle,
  onImportClick,
  onNewGroupClick,
}: GroupsPageHeaderProps) {
  return (
    <PageHeader
      actions={
        <>
        <IconButton
          ariaExpanded={areFiltersOpen}
          label={areFiltersOpen ? "Hide filters" : "Show filters"}
          onClick={onFilterToggle}
        >
          <FilterIcon />
        </IconButton>
        <button
          aria-label="Import groups from CSV"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-button-border text-text-control transition hover:bg-panel-soft sm:w-auto sm:px-4 sm:text-sm sm:font-semibold"
          onClick={onImportClick}
          title="Import groups from CSV"
          type="button"
        >
          <FileUpIcon />
          <span className="hidden sm:ml-2 sm:inline">Import CSV</span>
        </button>
        <button
          aria-label="New group"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand text-white transition hover:bg-brand-hover sm:w-auto sm:px-4 sm:text-sm sm:font-semibold"
          onClick={onNewGroupClick}
          title="New group"
          type="button"
        >
          <PlusIcon />
          <span className="hidden sm:ml-2 sm:inline">New Group</span>
        </button>
        </>
      }
      description="Student groups and memberships."
      icon={<UsersIcon />}
      title="Groups"
    />
  );
}
