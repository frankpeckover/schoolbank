"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  createUser,
  listUserGroups,
  resetUserPassword,
  updateUser,
  uploadUserProfileImage,
} from "@/lib/actions";
import { PasswordResetSection } from "@/components/admin-users/password-reset-section";
import { StudentGroupsSection } from "@/components/admin-users/student-groups-section";
import { UserFormFields } from "@/components/admin-users/user-form-fields";
import { UserModalActions } from "@/components/admin-users/user-modal-actions";
import {
  emptyUserForm,
  type UserFormState,
  type UserModalProps,
} from "@/components/admin-users/user-modal-types";
import type {
  UpdateUserInput,
  UserListItem,
} from "@/services/user-service";
import type { UserGroupItem } from "@/services/group-service";

export function UserModal({
  mode,
  onClose,
  onSaved,
  user,
}: UserModalProps) {
  const [form, setForm] = useState<UserFormState>(() =>
    getInitialFormState(mode, user),
  );
  const [newPassword, setNewPassword] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [userGroups, setUserGroups] = useState<UserGroupItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoadingUserGroups, setIsLoadingUserGroups] = useState(
    mode === "edit" && user?.role === "student",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    let isActive = true;

    if (mode !== "edit" || !user || form.role !== "student") {
      Promise.resolve().then(() => {
        if (isActive) {
          setUserGroups([]);
          setIsLoadingUserGroups(false);
        }
      });
      return () => {
        isActive = false;
      };
    }

    Promise.resolve().then(async () => {
      setIsLoadingUserGroups(true);

      try {
        const groups = await listUserGroups(user.id);

        if (isActive) {
          setUserGroups(groups);
          setError(null);
        }
      } catch {
        if (isActive) {
          setUserGroups([]);
          setError("Could not load student groups.");
        }
      } finally {
        if (isActive) {
          setIsLoadingUserGroups(false);
        }
      }
    });

    return () => {
      isActive = false;
    };
  }, [form.role, mode, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    let profileImageUrl = form.profileImageUrl;

    if (profileImageFile) {
      const imageFormData = new FormData();
      imageFormData.append("image", profileImageFile);

      const uploadResult = await uploadUserProfileImage(imageFormData);

      if (uploadResult.ok === false) {
        setError(uploadResult.message);
        setIsSaving(false);
        return;
      }

      profileImageUrl = uploadResult.imageUrl;
    }

    const formWithImage = {
      ...form,
      profileImageUrl,
    };

    const result =
      mode === "create"
        ? await createUser(formWithImage)
        : await updateUser(getUpdateUserInput(formWithImage));

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    onSaved();
  }

  async function handlePasswordReset() {
    setIsResettingPassword(true);
    setError(null);
    setMessage(null);

    const result = await resetUserPassword({
      id: form.id,
      password: newPassword,
    });

    if (!result.ok) {
      setError(result.message);
      setIsResettingPassword(false);
      return;
    }

    setNewPassword("");
    setMessage("Password reset.");
    setIsResettingPassword(false);
  }

  function updateFormField<Field extends keyof UserFormState>(
    field: Field,
    value: UserFormState[Field],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="theme-panel motion-pop w-full max-w-lg p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold">
              {mode === "create" ? "New User" : "Edit User"}
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              {mode === "create"
                ? "Create a user for this school."
                : "Update user details and access."}
            </p>
          </div>
          <button
            className="rounded-md border border-button-border px-3 py-2 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <UserFormFields
            imageFileName={profileImageFile?.name ?? ""}
            form={form}
            mode={mode}
            onChange={updateFormField}
            onProfileImageChange={setProfileImageFile}
          />
          {mode === "edit" && form.role === "student" && (
            <StudentGroupsSection
              groups={userGroups}
              isLoading={isLoadingUserGroups}
            />
          )}

          {error && (
            <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-semibold text-success">
              {message}
            </p>
          )}

          <UserModalActions
            isSaving={isSaving}
            mode={mode}
            onCancel={onClose}
          />
        </form>

        {mode === "edit" && (
          <PasswordResetSection
            isResettingPassword={isResettingPassword}
            newPassword={newPassword}
            onNewPasswordChange={setNewPassword}
            onPasswordReset={handlePasswordReset}
          />
        )}
      </div>
    </div>
  );
}

function getInitialFormState(
  mode: UserModalProps["mode"],
  user?: UserListItem,
): UserFormState {
  if (mode === "edit" && user) {
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profileImageUrl: user.profileImageUrl,
      role: user.role,
      password: "",
      isActive: user.isActive,
    };
  }

  return emptyUserForm;
}

function getUpdateUserInput(form: UserFormState): UpdateUserInput {
  return {
    id: form.id,
    username: form.username,
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    profileImageUrl: form.profileImageUrl,
    role: form.role,
    isActive: form.isActive,
  };
}
