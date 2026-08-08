import { appConfig } from "@/lib/app-config";

type AppBrandProps = {
  showNameOnMobile?: boolean;
  size?: "default" | "large";
};

export function AppBrand({
  showNameOnMobile = false,
  size = "default",
}: AppBrandProps) {
  const logoClassName =
    size === "large"
      ? "h-12 w-12 rounded-2xl sm:h-14 sm:w-14"
      : "h-10 w-10 rounded-2xl";
  const textClassName =
    size === "large" ? "text-2xl sm:text-3xl" : "text-base sm:text-lg";
  const lockupClassName =
    size === "large"
      ? "h-12 max-w-64 sm:h-14"
      : "h-9 max-w-[10.5rem]";

  if (showNameOnMobile && appConfig.lockupUrl) {
    return (
      <img
        alt={`${appConfig.name} logo`}
        className={`${lockupClassName} min-w-0 shrink object-contain object-left`}
        src={appConfig.lockupUrl}
      />
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <AppLogo className={logoClassName} />
      <span
        className={`truncate font-bold tracking-normal text-foreground ${textClassName} ${
          showNameOnMobile ? "block" : "hidden sm:block"
        }`}
      >
        {appConfig.name}
      </span>
    </div>
  );
}

function AppLogo({ className }: { className: string }) {
  if (appConfig.logoUrl) {
    return (
      <img
        alt={`${appConfig.name} logo`}
        className={`${className} shrink-0 object-contain`}
        src={appConfig.logoUrl}
      />
    );
  }

  return (
    <div
      aria-label={`${appConfig.name} initials`}
      className={`${className} flex shrink-0 items-center justify-center border border-border-subtle bg-surface text-sm font-bold text-brand shadow-sm`}
      role="img"
    >
      {appConfig.initials}
    </div>
  );
}
