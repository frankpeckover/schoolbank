import { SchoolBankApp } from "@/components/school-bank-app";
import { getCurrentSessionUser } from "@/lib/actions";

export default async function Home() {
  const currentUser = await getCurrentSessionUser();

  return <SchoolBankApp initialUser={currentUser} />;
}
