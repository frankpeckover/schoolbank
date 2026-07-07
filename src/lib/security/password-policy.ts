export type PasswordPolicyResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

const minimumPasswordLength = 8;
const maximumPasswordLength = 256;

export function validateNewPassword(password: string): PasswordPolicyResult {
  if (!password) {
    return {
      ok: false,
      message: "Enter a new password.",
    };
  }

  if (password.length < minimumPasswordLength) {
    return {
      ok: false,
      message: `New password must be at least ${minimumPasswordLength} characters.`,
    };
  }

  if (password.length > maximumPasswordLength) {
    return {
      ok: false,
      message: `New password must be ${maximumPasswordLength} characters or fewer.`,
    };
  }

  return { ok: true };
}

export function isPasswordTooLong(password: string) {
  return password.length > maximumPasswordLength;
}
