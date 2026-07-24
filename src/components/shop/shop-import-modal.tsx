"use client";

import { useState, type ChangeEvent } from "react";
import { importShopItems } from "@/lib/actions";
import { parseCsvObjects } from "@/lib/csv";
import { CsvFileInput } from "@/components/ui/csv-file-input";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import type {
  ImportShopItemError,
  ImportShopItemInput,
} from "@/services/shop-service";

type ShopImportModalProps = {
  onClose: () => void;
  onImportCompleted: () => void;
  onImported: (message: string, shouldClose?: boolean) => void;
};

type ParseResult =
  | {
      items: ImportShopItemInput[];
      ok: true;
    }
  | {
      message: string;
      ok: false;
    };

const csvHeaders = "name,description,price,quantity,image_url";

export function ShopImportModal({
  onClose,
  onImportCompleted,
  onImported,
}: ShopImportModalProps) {
  const [fileName, setFileName] = useState("");
  const [items, setItems] = useState<ImportShopItemInput[]>([]);
  const [errors, setErrors] = useState<ImportShopItemError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setItems([]);
    setErrors([]);
    setMessage(null);
    setError(null);

    if (!file) {
      setFileName("");
      return;
    }

    setFileName(file.name);

    const text = await file.text();
    const result = parseShopItemsCsv(text);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setItems(result.items);
    setMessage(`${result.items.length} item${result.items.length === 1 ? "" : "s"} ready to import.`);
  }

  async function handleImport() {
    if (items.length === 0) {
      setError("Choose a CSV file with at least one shop item.");
      return;
    }

    setIsImporting(true);
    setError(null);
    setMessage(null);
    setErrors([]);

    const result = await importShopItems({ items });
    const importedText = [
      `${result.createdCount} created`,
      `${result.updatedCount} updated`,
    ].join(", ");
    const successMessage = `Imported shop items: ${importedText}.`;

    setIsImporting(false);
    setErrors(result.errors);
    setMessage(successMessage);
    onImportCompleted();
    onImported(successMessage, false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="app-modal theme-panel motion-pop w-full max-w-2xl p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold">Import Shop Items</h3>
            <p className="mt-1 text-sm text-text-muted">
              Upload a CSV with headers: {csvHeaders}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Existing items with the same name are updated.
            </p>
          </div>
          <ModalCloseButton onClick={onClose} />
        </div>

        <CsvFileInput
          fileName={fileName}
          id="shopCsvFile"
          onChange={handleFileChange}
        />

        {message && (
          <p className="mt-4 rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-semibold text-success">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
            {error}
          </p>
        )}

        {errors.length > 0 && <ImportErrors errors={errors} />}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="rounded-md border border-button-border px-4 py-2 text-sm font-semibold text-text-control transition hover:bg-panel-soft"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isImporting || items.length === 0}
            onClick={handleImport}
            type="button"
          >
            {isImporting ? "Importing..." : "Import Items"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportErrors({ errors }: { errors: ImportShopItemError[] }) {
  return (
    <div className="mt-4 rounded-md border border-danger-border bg-danger-soft p-3">
      <p className="text-sm font-semibold text-danger-strong">
        Some rows could not be imported.
      </p>
      <ul className="mt-2 max-h-40 overflow-y-auto text-sm text-danger-strong">
        {errors.map((error) => (
          <li key={`${error.rowNumber}-${error.name}`}>
            Row {error.rowNumber}
            {error.name ? ` (${error.name})` : ""}: {error.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function parseShopItemsCsv(text: string): ParseResult {
  const { objects, rows } = parseCsvObjects(text);

  if (rows.length < 2) {
    return {
      ok: false,
      message: "CSV must include a header row and at least one item row.",
    };
  }

  const items: ImportShopItemInput[] = [];

  for (const { row, rowNumber, values } of objects) {
    if (row.every((value) => !value.trim())) {
      continue;
    }

    const price = Number(values.price?.trim() ?? "");
    const quantity = Number(values.quantity?.trim() ?? "");
    const item = {
      description: values.description?.trim() ?? "",
      imageUrl: values.imageurl?.trim() ?? "",
      name: values.name?.trim() ?? "",
      price,
      quantity,
    };

    if (!item.name) {
      return {
        ok: false,
        message: `Row ${rowNumber} is missing an item name.`,
      };
    }

    if (!Number.isFinite(price) || !Number.isFinite(quantity)) {
      return {
        ok: false,
        message: `Row ${rowNumber} has an invalid price or quantity.`,
      };
    }

    if (price < 0 || quantity < 0) {
      return {
        ok: false,
        message: `Row ${rowNumber} has a negative price or quantity.`,
      };
    }

    items.push(item);
  }

  if (items.length === 0) {
    return {
      ok: false,
      message: "CSV does not contain any shop items.",
    };
  }

  return { items, ok: true };
}
