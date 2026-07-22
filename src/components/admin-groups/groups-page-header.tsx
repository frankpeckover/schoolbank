import { IconButton } from "@/components/ui/icon-button";
import { FileDownIcon, FileUpIcon, PlusIcon } from "@/components/ui/icons";
import { PanelToolbar } from "@/components/ui/panel-toolbar";

type GroupsPageHeaderProps = {
  count: number;
  onExportClick: () => void;
  onImportClick: () => void;
  onNewGroupClick: () => void;
  totalCount: number;
};

export function GroupsPageHeader({
  count,
  onExportClick,
  onImportClick,
  onNewGroupClick,
  totalCount,
}: GroupsPageHeaderProps) {
  return (
    <PanelToolbar
      actions={
        <>
          <IconButton
            disabled={count === 0}
            label="Export groups"
            onClick={onExportClick}
            text="Export"
          >
            <FileDownIcon />
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
