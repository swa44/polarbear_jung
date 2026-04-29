import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LucciairShell from "@/components/customer/LucciairShell";

export default async function LucciairCustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get("customer_session")?.value;

  if (!session) {
    redirect("/login");
  }

  return <LucciairShell>{children}</LucciairShell>;
}
