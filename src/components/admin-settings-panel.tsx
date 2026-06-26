"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  getSchoolInfo,
  updateSchoolInfo,
  uploadSchoolLogo,
} from "@/lib/actions";
import { appConfig } from "@/lib/app-config";
import { defaultCurrencyName } from "@/lib/school-defaults";
import { TermDepositSettingsForm } from "@/components/admin-settings/term-deposit-settings-form";
import { FileUpIcon, UsersIcon, WalletIcon } from "@/components/ui/icons";
import { SchoolLogo } from "@/components/ui/school-logo";
import type { SchoolInfo } from "@/services/school-service";

type AdminSettingsPanelProps = {
  onSchoolInfoUpdated: (schoolInfo: SchoolInfo) => void;
};

const fallbackSchoolInfo: SchoolInfo = {
  name: appConfig.defaultSchoolName,
  address: "",
  contactEmail: "",
  planType: "trial",
  currencyName: defaultCurrencyName,
  logoUrl: "",
  phone: "",
  website: "",
  timezone: "",
};

const logoHelpText = "PNG, JPG, WebP, or GIF. Max 2 MB.";

export function AdminSettingsPanel({
  onSchoolInfoUpdated,
}: AdminSettingsPanelProps) {
  const [form, setForm] = useState<SchoolInfo>(fallbackSchoolInfo);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
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
    setError(null);
    setMessage(null);

    let logoUrl = form.logoUrl;

    if (logoFile) {
      const logoFormData = new FormData();
      logoFormData.append("logo", logoFile);

      const uploadResult = await uploadSchoolLogo(logoFormData);

      if (!uploadResult.ok) {
        setError(uploadResult.message);
        setIsSaving(false);
        return;
      }

      logoUrl = uploadResult.logoUrl;
    }

    const result = await updateSchoolInfo({
      ...form,
      logoUrl,
    });

    if (!result.ok) {
      setError(result.message);
      setIsSaving(false);
      return;
    }

    const savedSchoolInfo = {
      ...form,
      logoUrl,
    };

    setForm(savedSchoolInfo);
    setLogoFile(null);
    setMessage("School settings saved.");
    setIsSaving(false);
    onSchoolInfoUpdated(savedSchoolInfo);
  }

  function updateField<Field extends keyof SchoolInfo>(
    field: Field,
    value: SchoolInfo[Field],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="mt-5 space-y-5">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <SettingsPanel
          icon={<WalletIcon />}
          title="Organisation Profile"
        >
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <LogoUploadField
              currentLogoUrl={form.logoUrl}
              fileName={logoFile?.name ?? ""}
              onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
              schoolName={form.name}
            />
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <TextField
                id="schoolName"
                label="School name"
                onChange={(value) => updateField("name", value)}
                required
                value={form.name}
              />
              <TextField
                id="currencyName"
                label="Currency name"
                onChange={(value) => updateField("currencyName", value)}
                required
                value={form.currencyName}
              />
              <TextField
                id="timezone"
                label="Timezone"
                onChange={(value) => updateField("timezone", value)}
                placeholder="Australia/Brisbane"
                value={form.timezone}
              />
              <ReadOnlyField label="Plan type" value={formatPlanType(form.planType)} />
            </div>
          </div>
        </SettingsPanel>

        <SettingsPanel
          icon={<UsersIcon />}
          title="Contact Details"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              id="contactEmail"
              label="Contact email"
              onChange={(value) => updateField("contactEmail", value)}
              placeholder="office@example.edu"
              type="email"
              value={form.contactEmail}
            />
            <TextField
              id="phone"
              label="Phone"
              onChange={(value) => updateField("phone", value)}
              placeholder="+61..."
              value={form.phone}
            />
            <TextField
              id="website"
              label="Website"
              onChange={(value) => updateField("website", value)}
              placeholder="https://example.edu"
              type="url"
              value={form.website}
            />
            <TextField
              id="address"
              label="Address"
              onChange={(value) => updateField("address", value)}
              value={form.address}
            />
          </div>
        </SettingsPanel>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SettingsMessages error={error} message={message} />
          <button
            className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>

      <TermDepositSettingsForm />
    </section>
  );
}

function SettingsPanel({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="theme-panel min-w-0 overflow-hidden p-4 sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      </div>
      <div className="mt-5 min-w-0">{children}</div>
    </section>
  );
}

function TextField({
  id,
  label,
  onChange,
  placeholder = "",
  required = false,
  type = "text",
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: "email" | "text" | "url";
  value: string;
}) {
  return (
    <div className="min-w-0">
      <label className="text-sm font-semibold text-text-control" htmlFor={id}>
        {label}
      </label>
      <input
        className="mt-2 block w-full min-w-0 max-w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </div>
  );
}

function LogoUploadField({
  currentLogoUrl,
  fileName,
  onChange,
  schoolName,
}: {
  currentLogoUrl: string;
  fileName: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  schoolName: string;
}) {
  return (
    <div className="theme-subpanel min-w-0 overflow-hidden p-3 sm:p-4">
      <label className="text-sm font-semibold text-text-control" htmlFor="logo">
        Logo
      </label>
      <div className="mt-3 flex min-w-0 items-center gap-3 sm:gap-4">
        <SchoolLogo logoUrl={currentLogoUrl} name={schoolName} size="large" />
        <div className="min-w-0 flex-1">
          <input
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            id="logo"
            onChange={onChange}
            type="file"
          />
          <label
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md bg-brand text-white transition hover:bg-brand-hover sm:w-auto sm:px-4 sm:text-sm sm:font-semibold"
            htmlFor="logo"
            title="Upload logo"
          >
            <FileUpIcon />
            <span className="hidden sm:ml-2 sm:inline">Upload Logo</span>
          </label>
          <p className="mt-2 truncate text-sm text-text-muted">
            {fileName || logoHelpText}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatPlanType(planType: string) {
  return planType
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-text-control">{label}</p>
      <p className="theme-subpanel mt-2 truncate px-3 py-3 text-sm text-text-muted">
        {value}
      </p>
    </div>
  );
}

function SettingsMessages({
  error,
  message,
}: {
  error: string | null;
  message: string | null;
}) {
  return (
    <div className="min-h-10 flex-1">
      {message && (
        <p className="rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm font-semibold text-success">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-strong">
          {error}
        </p>
      )}
    </div>
  );
}
