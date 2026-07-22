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
    <div className="mt-4 border-t border-border-subtle pt-4 sm:mt-5 sm:pt-5">
      <h4 className="text-base font-semibold sm:text-lg">Reset Password</h4>
      <div className="mt-2 flex flex-col gap-2 sm:mt-3 sm:flex-row sm:gap-3">
        <input
          className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none ring-brand transition focus:ring-2 sm:py-3"
          onChange={(event) => onNewPasswordChange(event.target.value)}
          placeholder="New password"
          type="password"
          value={newPassword}
        />
        <button
          className="rounded-md border border-button-border px-4 py-2.5 text-sm font-semibold text-text-control transition hover:bg-panel-soft disabled:cursor-not-allowed disabled:opacity-70 sm:py-3"
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
