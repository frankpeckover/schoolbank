type PasswordResetSectionProps = {
  isResettingPassword: boolean;
  newPassword: string;
  onNewPasswordChange: (password: string) => void;
  onPasswordReset: () => void;
};

export function PasswordResetSection({
  isResettingPassword,
  newPassword,
  onNewPasswordChange,
  onPasswordReset,
}: PasswordResetSectionProps) {
  return (
    <div className="mt-5 border-t border-border-subtle pt-5">
      <h4 className="text-lg font-semibold">Reset Password</h4>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          className="w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
          onChange={(event) => onNewPasswordChange(event.target.value)}
          placeholder="New password"
          type="password"
          value={newPassword}
        />
        <button
          className="rounded-md border border-button-border px-4 py-3 text-sm font-semibold text-text-control transition hover:bg-panel-soft disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isResettingPassword}
          onClick={onPasswordReset}
          type="button"
        >
          {isResettingPassword ? "Resetting..." : "Reset"}
        </button>
      </div>
    </div>
  );
}
