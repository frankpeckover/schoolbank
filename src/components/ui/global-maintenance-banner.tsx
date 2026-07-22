type GlobalMaintenanceBannerProps = {
  message: string;
};

export function GlobalMaintenanceBanner({
  message,
}: GlobalMaintenanceBannerProps) {
  const maintenanceMessage = message.trim();

  if (!maintenanceMessage) {
    return null;
  }

  return (
    <section className="border-b border-accent/25 bg-accent-soft px-4 py-3 text-accent">
      <div className="mx-auto flex max-w-7xl items-start gap-3 text-sm">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface/75 font-semibold">
          i
        </span>
        <div className="min-w-0">
          <p className="font-semibold">Service Notice</p>
          <p className="mt-1 whitespace-pre-wrap leading-6 text-text-control">
            {maintenanceMessage}
          </p>
        </div>
      </div>
    </section>
  );
}
