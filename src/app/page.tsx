import { AppEntry } from "@/components/app-entry";
import { getCurrentSessionUser } from "@/lib/actions";
import { assertCurrentTenantExists } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function Home() {
  try {
    await assertCurrentTenantExists();
  } catch {
    notFound();
  }

  const currentUser = await getCurrentSessionUser();
  const maintenanceMessage = process.env.MAINTENANCE_MESSAGE?.trim() ?? "";

  return (
    <AppEntry
      initialUser={currentUser}
      maintenanceMessage={maintenanceMessage}
    />
  );
}
