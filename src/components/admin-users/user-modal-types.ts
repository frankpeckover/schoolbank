import type { Role } from "@/lib/session";
import type { SessionUser } from "@/lib/session";
import type {
  CreateUserInput,
  UserListItem,
} from "@/services/user-service";

export type UserModalMode = "create" | "edit";

export type UserFormState = CreateUserInput & {
  id: string;
  isActive: boolean;
};

export type UserFormFieldChange = <Field extends keyof UserFormState>(
  field: Field,
  value: UserFormState[Field],
) => void;

export type UserModalProps = {
  currentUser: SessionUser;
  mode: UserModalMode;
  onClose: () => void;
  onSaved: () => void;
  user?: UserListItem;
};

export const emptyUserForm: UserFormState = {
  id: "",
  username: "",
  firstName: "",
  lastName: "",
  email: "",
  role: "student" satisfies Role,
  password: "",
  isActive: true,
};
