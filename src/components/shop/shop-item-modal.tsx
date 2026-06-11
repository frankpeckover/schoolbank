"use client";

import { useState, type FormEvent } from "react";
import { saveShopItem } from "@/lib/actions";
import type { SaveShopItemInput, ShopItem } from "@/services/shop-service";

type ShopItemModalProps = {
  item: ShopItem | null;
  onClose: () => void;
  onSaved: () => void;
};

type ShopItemFormState = Omit<SaveShopItemInput, "price" | "quantity"> & {
  price: string;
  quantity: string;
};

const emptyShopItemForm: ShopItemFormState = {
  name: "",
  description: "",
  price: "",
  quantity: "",
};

const modalCopy = {
  close: "Close",
  cancel: "Cancel",
  description: "Set the item details students will see.",
  editTitle: "Edit Item",
  errorClassName:
    "rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong",
  newTitle: "New Item",
  save: "Save Item",
  saving: "Saving...",
} as const;

const fieldClassNames = {
  input:
    "mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2",
  label: "text-sm font-semibold text-text-control",
  textarea:
    "mt-2 min-h-24 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2",
} as const;

export function ShopItemModal({ item, onClose, onSaved }: ShopItemModalProps) {
  const [form, setForm] = useState<ShopItemFormState>(() =>
    getInitialFormState(item),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function updateFormField<Field extends keyof ShopItemFormState>(
    field: Field,
    value: ShopItemFormState[Field],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const result = await saveShopItem({
      ...form,
      price: Number(form.price),
      quantity: Number(form.quantity),
    });

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    setError(null);
    setIsSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-lg rounded-md border border-border bg-surface p-5 shadow-lg">
        <ModalHeader item={item} onClose={onClose} />

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <TextField
            id="itemName"
            label="Name"
            onChange={(value) => updateFormField("name", value)}
            value={form.name}
          />

          <TextAreaField
            id="itemDescription"
            label="Description"
            onChange={(value) => updateFormField("description", value)}
            value={form.description}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              id="itemPrice"
              label="Price"
              onChange={(value) => updateFormField("price", value)}
              value={form.price}
            />
            <NumberField
              id="itemQuantity"
              label="Quantity"
              onChange={(value) => updateFormField("quantity", value)}
              value={form.quantity}
            />
          </div>

          {error && <p className={modalCopy.errorClassName}>{error}</p>}

          <ModalActions
            isSaving={isSaving}
            onCancel={onClose}
          />
        </form>
      </div>
    </div>
  );
}

function ModalHeader({
  item,
  onClose,
}: Pick<ShopItemModalProps, "item" | "onClose">) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-2xl font-semibold">
          {item ? modalCopy.editTitle : modalCopy.newTitle}
        </h3>
        <p className="mt-1 text-sm text-text-muted">{modalCopy.description}</p>
      </div>
      <button
        className="rounded-md border border-button-border px-3 py-2 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
        onClick={onClose}
        type="button"
      >
        {modalCopy.close}
      </button>
    </div>
  );
}

function TextField({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div>
      <label className={fieldClassNames.label} htmlFor={id}>
        {label}
      </label>
      <input
        className={fieldClassNames.input}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </div>
  );
}

function TextAreaField({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div>
      <label className={fieldClassNames.label} htmlFor={id}>
        {label}
      </label>
      <textarea
        className={fieldClassNames.textarea}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </div>
  );
}

function NumberField({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div>
      <label className={fieldClassNames.label} htmlFor={id}>
        {label}
      </label>
      <input
        className={fieldClassNames.input}
        id={id}
        min="0"
        onChange={(event) => onChange(event.target.value)}
        type="number"
        value={value}
      />
    </div>
  );
}

function ModalActions({
  isSaving,
  onCancel,
}: {
  isSaving: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        className="rounded-md border border-button-border px-4 py-3 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
        onClick={onCancel}
        type="button"
      >
        {modalCopy.cancel}
      </button>
      <button
        className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? modalCopy.saving : modalCopy.save}
      </button>
    </div>
  );
}

function getInitialFormState(item: ShopItem | null): ShopItemFormState {
  return {
    id: item?.id,
    name: item?.name ?? emptyShopItemForm.name,
    description: item?.description ?? emptyShopItemForm.description,
    price: item ? String(item.price) : emptyShopItemForm.price,
    quantity: item ? String(item.quantity) : emptyShopItemForm.quantity,
  };
}
