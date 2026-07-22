import { AppEntry } from "@/components/app-entry";
import { getCurrentSessionUser } from "@/lib/actions";

export default async function Home() {
  const currentUser = await getCurrentSessionUser();
  const maintenanceMessage = process.env.MAINTENANCE_MESSAGE?.trim() ?? "";

  return (
    <AppEntry
      initialUser={currentUser}
      maintenanceMessage={maintenanceMessage}
    />
  );
}
