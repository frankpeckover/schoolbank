import type { UserModalMode } from "@/components/admin-users/user-modal-types";

type UserModalActionsProps = {
  isSaving: boolean;
  mode: UserModalMode;
  onCancel: () => void;
};

export function UserModalActions({
  isSaving,
  mode,
  onCancel,
}: UserModalActionsProps) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        className="rounded-md border border-button-border px-4 py-3 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
        onClick={onCancel}
        type="button"
      >
        Cancel
      </button>
      <button
        className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isSaving}
        type="submit"
      >
        {isSaving
          ? "Saving..."
          : mode === "create"
            ? "Create User"
            : "Save User"}
      </button>
    </div>
  );
}
