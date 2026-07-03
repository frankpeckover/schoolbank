import { IconButton } from "@/components/ui/icon-button";
import { FileUpIcon, FilterIcon, PlusIcon } from "@/components/ui/icons";
import { PanelToolbar } from "@/components/ui/panel-toolbar";

type GroupsPageHeaderProps = {
  areFiltersOpen: boolean;
  count: number;
  onFilterToggle: () => void;
  onImportClick: () => void;
  onNewGroupClick: () => void;
  totalCount: number;
};

export function GroupsPageHeader({
  areFiltersOpen,
  count,
  onFilterToggle,
  onImportClick,
  onNewGroupClick,
  totalCount,
}: GroupsPageHeaderProps) {
  return (
    <PanelToolbar
      actions={
        <>
          <IconButton
            ariaExpanded={areFiltersOpen}
            label={areFiltersOpen ? "Hide filters" : "Show filters"}
            onClick={onFilterToggle}
            text="Filters"
          >
            <FilterIcon />
          </IconButton>
          <IconButton
            label="Import groups from CSV"
            onClick={onImportClick}
            text="Import CSV"
          >
            <FileUpIcon />
          </IconButton>
          <IconButton
            label="New group"
            onClick={onNewGroupClick}
            text="New Group"
            tone="primary"
          >
            <PlusIcon />
          </IconButton>
        </>
      }
    >
      {totalCount > 0 && (
        <p className="text-sm font-semibold text-text-muted">
          Showing {count} of {totalCount} groups.
        </p>
      )}
    </PanelToolbar>
  );
}
