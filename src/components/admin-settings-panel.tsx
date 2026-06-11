"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getSchoolInfo, updateSchoolInfo } from "@/lib/actions";
import type { SchoolInfo } from "@/services/school-service";

const fallbackSchoolInfo: SchoolInfo = {
  name: "SchoolBank School",
  address: "",
  planType: "trial",
  currencyName: "credits",
};

type AdminSettingsPanelProps = {
  onSchoolInfoUpdated: (schoolInfo: SchoolInfo) => void;
};

export function AdminSettingsPanel({
  onSchoolInfoUpdated,
}: AdminSettingsPanelProps) {
  const [form, setForm] = useState<SchoolInfo>(fallbackSchoolInfo);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSchoolInfo() {
      try {
        const schoolInfo = await getSchoolInfo();

        if (isMounted) {
          setForm(schoolInfo);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Could not load school settings.");
        }
      }
    }

    loadSchoolInfo();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const result = await updateSchoolInfo({
      name: form.name,
      address: form.address,
      currencyName: form.currencyName,
    });

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    setError(null);
    setMessage("School settings saved.");
    setIsSaving(false);
    onSchoolInfoUpdated(form);
  }

  return (
    <section className="mt-5 rounded-md border border-border bg-surface p-5 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="mt-1 text-sm text-text-muted">
          Edit basic school information for this database.
        </p>
      </div>

      <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <TextField
          id="schoolName"
          label="School name"
          onChange={(value) => setForm((current) => ({ ...current, name: value }))}
          value={form.name}
        />
        <ReadOnlyField label="Plan type" value={form.planType} />
        <TextField
          id="currencyName"
          label="Currency name"
          onChange={(value) =>
            setForm((current) => ({ ...current, currencyName: value }))
          }
          value={form.currencyName}
        />
        <TextField
          id="address"
          label="Address"
          onChange={(value) =>
            setForm((current) => ({ ...current, address: value }))
          }
          value={form.address}
        />

        <div className="md:col-span-2">
          <button
            className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>

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
    </section>
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
      <label className="text-sm font-semibold text-text-control" htmlFor={id}>
        {label}
      </label>
      <input
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-text-control">{label}</p>
      <p className="mt-2 rounded-md border border-border-subtle bg-panel-soft px-3 py-3 text-sm text-text-muted">
        {value}
      </p>
    </div>
  );
}
