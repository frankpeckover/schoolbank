import { appConfig } from "@/lib/app-config";

export function AppBrand() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <AppLogo />
      <span className="hidden truncate text-base font-bold tracking-normal text-foreground sm:block sm:text-lg">
        {appConfig.name}
      </span>
    </div>
  );
}

function AppLogo() {
  if (appConfig.logoUrl) {
    return (
      <div
        aria-label={`${appConfig.name} logo`}
        className="h-10 w-10 shrink-0 rounded-full bg-contain bg-center bg-no-repeat"
        role="img"
        style={{ backgroundImage: `url("${appConfig.logoUrl}")` }}
      />
    );
  }

  return (
    <div
      aria-label={`${appConfig.name} initials`}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface text-sm font-bold text-brand shadow-sm"
      role="img"
    >
      {appConfig.initials}
    </div>
  );
}
