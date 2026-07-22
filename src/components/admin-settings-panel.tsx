"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  exportSchoolData,
  getSchoolInfo,
  listSsoProviderSettings,
  getTransactionPresets,
  updateSchoolInfo,
  updateSsoProvider,
  updateTransactionPresets,
  uploadSchoolLogo,
} from "@/lib/actions";
import { appConfig } from "@/lib/app-config";
import { defaultCurrencyName } from "@/lib/school-defaults";
import {
  defaultTransactionPresets,
  maxQuickAmounts,
  maxQuickReasons,
} from "@/lib/transaction-presets";
import {
  FileDownIcon,
  FileUpIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { SchoolLogo } from "@/components/ui/school-logo";
import type { SchoolInfo } from "@/services/school-service";
import type { SsoProviderSettings, SsoProviderType } from "@/lib/sso-types";

type AdminSettingsPanelProps = {
  onSchoolInfoUpdated: (schoolInfo: SchoolInfo) => void;
};

const fallbackSchoolInfo: SchoolInfo = {
  name: appConfig.defaultSchoolName,
  address: "",
  contactEmail: "",
  currencyName: defaultCurrencyName,
  logoUrl: "",
  phone: "",
  website: "",
  timezone: "",
};

const logoHelpText = "PNG, JPG, WebP, or GIF. Max 2 MB.";
const emptySsoSecrets: Record<SsoProviderType, string> = {
  google: "",
  microsoft_entra: "",
};

export function AdminSettingsPanel({
  onSchoolInfoUpdated,
}: AdminSettingsPanelProps) {
  const [form, setForm] = useState<SchoolInfo>(fallbackSchoolInfo);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPresets, setIsSavingPresets] = useState(false);
  const [presetAmounts, setPresetAmounts] = useState<string[]>(
    getPresetAmountFields(defaultTransactionPresets.amounts),
  );
  const [presetReasons, setPresetReasons] = useState<string[]>(
    getPresetReasonFields(defaultTransactionPresets.reasons),
  );
  const [presetError, setPresetError] = useState<string | null>(null);
  const [presetMessage, setPresetMessage] = useState<string | null>(null);
  const [ssoProviders, setSsoProviders] = useState<SsoProviderSettings[]>([]);
  const [ssoSecrets, setSsoSecrets] =
    useState<Record<SsoProviderType, string>>(emptySsoSecrets);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const [ssoMessage, setSsoMessage] = useState<string | null>(null);
  const [savingSsoProvider, setSavingSsoProvider] =
    useState<SsoProviderType | null>(null);

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

  useEffect(() => {
    let isMounted = true;

    async function loadSsoProviders() {
      try {
        const providers = await listSsoProviderSettings();

        if (isMounted) {
          setSsoProviders(providers);
          setSsoError(null);
        }
      } catch {
        if (isMounted) {
          setSsoError("Could not load SSO settings.");
        }
      }
    }

    loadSsoProviders();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadTransactionPresets() {
      try {
        const presets = await getTransactionPresets();

        if (isMounted) {
          setPresetAmounts(getPresetAmountFields(presets.amounts));
          setPresetReasons(getPresetReasonFields(presets.reasons));
          setPresetError(null);
        }
      } catch {
        if (isMounted) {
          setPresetError("Could not load quick amounts and reasons.");
        }
      }
    }

    loadTransactionPresets();

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

  async function handlePresetsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingPresets(true);
    setPresetError(null);
    setPresetMessage(null);

    const result = await updateTransactionPresets({
      amounts: presetAmounts
        .map((amount) => Number(amount))
        .filter((amount) => Number.isInteger(amount) && amount > 0),
      reasons: presetReasons.map((reason) => reason.trim()).filter(Boolean),
    });

    if (!result.ok) {
      setPresetError(result.message);
      setIsSavingPresets(false);
      return;
    }

    setPresetMessage("Quick amounts and reasons saved.");
    setIsSavingPresets(false);
  }

  async function handleDataExport() {
    setIsExporting(true);
    setExportError(null);
    setExportMessage(null);

    try {
      const exportResult = await exportSchoolData();

      downloadBase64File(
        exportResult.fileName,
        exportResult.dataBase64,
        exportResult.mimeType,
      );
      setExportMessage("School data export downloaded.");
    } catch (error) {
      console.error("Export school data failed", error);
      setExportError("Could not export school data.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleSsoSubmit(
    event: FormEvent<HTMLFormElement>,
    provider: SsoProviderSettings,
  ) {
    event.preventDefault();
    setSavingSsoProvider(provider.providerType);
    setSsoError(null);
    setSsoMessage(null);

    const result = await updateSsoProvider({
      ...provider,
      clientSecret: ssoSecrets[provider.providerType],
    });

    if (!result.ok) {
      setSsoError(result.message);
      setSavingSsoProvider(null);
      return;
    }

    const providers = await listSsoProviderSettings();

    setSsoProviders(providers);
    setSsoSecrets((current) => ({
      ...current,
      [provider.providerType]: "",
    }));
    setSsoMessage(`${provider.displayName} SSO settings saved.`);
    setSavingSsoProvider(null);
  }

  function updateSsoProviderField<Field extends keyof SsoProviderSettings>(
    providerType: SsoProviderType,
    field: Field,
    value: SsoProviderSettings[Field],
  ) {
    setSsoProviders((currentProviders) =>
      currentProviders.map((provider) =>
        provider.providerType === providerType
          ? { ...provider, [field]: value }
          : provider,
      ),
    );
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

      <SettingsPanel
        icon={<UsersIcon />}
        title="Single Sign-On"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {ssoProviders.map((provider) => (
            <SsoProviderForm
              key={provider.providerType}
              clientSecret={ssoSecrets[provider.providerType]}
              isSaving={savingSsoProvider === provider.providerType}
              onClientSecretChange={(value) =>
                setSsoSecrets((current) => ({
                  ...current,
                  [provider.providerType]: value,
                }))
              }
              onChange={updateSsoProviderField}
              onSubmit={(event) => handleSsoSubmit(event, provider)}
              provider={provider}
            />
          ))}
        </div>
        <div className="mt-4">
          <SettingsMessages error={ssoError} message={ssoMessage} />
        </div>
      </SettingsPanel>

      <form className="space-y-5" onSubmit={handlePresetsSubmit}>
        <SettingsPanel
          icon={<WalletIcon />}
          title="Quick Transactions"
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <QuickAmountFields
              amounts={presetAmounts}
              onChange={setPresetAmounts}
            />
            <QuickReasonFields
              onChange={setPresetReasons}
              reasons={presetReasons}
            />
          </div>
        </SettingsPanel>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SettingsMessages error={presetError} message={presetMessage} />
          <button
            className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSavingPresets}
            type="submit"
          >
            {isSavingPresets ? "Saving..." : "Save Quick Transactions"}
          </button>
        </div>
      </form>

      <SettingsPanel
        icon={<FileDownIcon />}
        title="Data Export"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-control">
              Export organisation data
            </p>
            <p className="mt-1 max-w-2xl text-sm text-text-muted">
              Downloads a ZIP file of CSV exports plus a manifest. Password
              hashes, sessions, reset tokens, platform credentials, and server
              error logs are not included.
            </p>
          </div>
          <button
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-control transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isExporting}
            onClick={handleDataExport}
            type="button"
          >
            <FileDownIcon />
            {isExporting ? "Exporting..." : "Export Data"}
          </button>
        </div>
        <div className="mt-4">
          <SettingsMessages error={exportError} message={exportMessage} />
        </div>
      </SettingsPanel>
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

function SsoProviderForm({
  clientSecret,
  isSaving,
  onChange,
  onClientSecretChange,
  onSubmit,
  provider,
}: {
  clientSecret: string;
  isSaving: boolean;
  onChange: <Field extends keyof SsoProviderSettings>(
    providerType: SsoProviderType,
    field: Field,
    value: SsoProviderSettings[Field],
  ) => void;
  onClientSecretChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  provider: SsoProviderSettings;
}) {
  const isMicrosoft = provider.providerType === "microsoft_entra";

  return (
    <form className="theme-subpanel min-w-0 space-y-4 p-4" onSubmit={onSubmit}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h4 className="text-base font-semibold text-text-control">
            {provider.displayName}
          </h4>
          <p className="mt-1 text-sm text-text-muted">
            {provider.isEnabled ? "Enabled on the login page" : "Hidden from login"}
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm font-semibold text-text-control">
          <input
            checked={provider.isEnabled}
            className="h-4 w-4 accent-[var(--color-brand)]"
            onChange={(event) =>
              onChange(provider.providerType, "isEnabled", event.target.checked)
            }
            type="checkbox"
          />
          Enabled
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          id={`${provider.providerType}-display-name`}
          label="Button label"
          onChange={(value) =>
            onChange(provider.providerType, "displayName", value)
          }
          value={provider.displayName}
        />
        <TextField
          id={`${provider.providerType}-client-id`}
          label="Client ID"
          onChange={(value) =>
            onChange(provider.providerType, "clientId", value)
          }
          value={provider.clientId}
        />
        {isMicrosoft && (
          <TextField
            id={`${provider.providerType}-tenant-id`}
            label="Tenant ID"
            onChange={(value) =>
              onChange(provider.providerType, "tenantId", value)
            }
            value={provider.tenantId}
          />
        )}
        <TextAreaField
          id={`${provider.providerType}-allowed-domain`}
          label={isMicrosoft ? "Allowed domains" : "Google Workspace domains"}
          onChange={(value) =>
            onChange(provider.providerType, "allowedDomain", value)
          }
          placeholder={`example.edu\nstudents.example.edu`}
          value={provider.allowedDomain}
        />
        <TextField
          id={`${provider.providerType}-issuer-url`}
          label="Issuer URL"
          onChange={(value) =>
            onChange(provider.providerType, "issuerUrl", value)
          }
          type="url"
          value={provider.issuerUrl}
        />
        <SsoSecretField
          hasClientSecret={provider.hasClientSecret}
          id={`${provider.providerType}-client-secret`}
          onChange={onClientSecretChange}
          value={clientSecret}
        />
      </div>

      <div className="flex justify-end">
        <button
          className="rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : `Save ${provider.displayName}`}
        </button>
      </div>
    </form>
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

function TextAreaField({
  id,
  label,
  onChange,
  placeholder = "",
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <label className="text-sm font-semibold text-text-control" htmlFor={id}>
        {label}
      </label>
      <textarea
        className="mt-2 block min-h-28 w-full min-w-0 max-w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      <p className="mt-1 text-xs text-text-muted">
        Enter one per line, or separate with commas.
      </p>
    </div>
  );
}

function SsoSecretField({
  hasClientSecret,
  id,
  onChange,
  value,
}: {
  hasClientSecret: boolean;
  id: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <label className="text-sm font-semibold text-text-control" htmlFor={id}>
        Client secret
      </label>
      <input
        autoComplete="new-password"
        className="mt-2 block w-full min-w-0 max-w-full rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={hasClientSecret ? "Stored. Enter a new value to replace." : ""}
        type="password"
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

function QuickAmountFields({
  amounts,
  onChange,
}: {
  amounts: string[];
  onChange: (amounts: string[]) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-text-control">Quick amounts</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-5 lg:grid-cols-1">
        {amounts.map((amount, index) => (
          <input
            className="block w-full min-w-0 rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
            key={`amount-${index}`}
            min="1"
            onChange={(event) =>
              onChange(updateArrayItem(amounts, index, event.target.value))
            }
            placeholder={`Amount ${index + 1}`}
            type="number"
            value={amount}
          />
        ))}
      </div>
    </div>
  );
}

function QuickReasonFields({
  onChange,
  reasons,
}: {
  onChange: (reasons: string[]) => void;
  reasons: string[];
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-text-control">Quick reasons</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {reasons.map((reason, index) => (
          <input
            className="block w-full min-w-0 rounded-md border border-border bg-surface px-3 py-3 text-sm outline-none ring-brand transition focus:ring-2"
            key={`reason-${index}`}
            onChange={(event) =>
              onChange(updateArrayItem(reasons, index, event.target.value))
            }
            placeholder={`Reason ${index + 1}`}
            type="text"
            value={reason}
          />
        ))}
      </div>
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

function downloadBase64File(filename: string, dataBase64: string, type: string) {
  const binary = atob(dataBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const blob = new Blob([bytes], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getPresetAmountFields(amounts: number[]) {
  return padPresetFields(
    amounts.slice(0, maxQuickAmounts).map((amount) => String(amount)),
    maxQuickAmounts,
  );
}

function getPresetReasonFields(reasons: string[]) {
  return padPresetFields(
    reasons.slice(0, maxQuickReasons),
    maxQuickReasons,
  );
}

function padPresetFields(values: string[], length: number) {
  return [
    ...values,
    ...Array.from({ length: Math.max(0, length - values.length) }, () => ""),
  ].slice(0, length);
}

function updateArrayItem(values: string[], index: number, value: string) {
  return values.map((currentValue, currentIndex) =>
    currentIndex === index ? value : currentValue,
  );
}
