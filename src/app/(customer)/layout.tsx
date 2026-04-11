import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CustomerShell from "@/components/customer/CustomerShell";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get("customer_session")?.value;

  if (!session) {
    redirect("/login");
  }

  return <CustomerShell>{children}</CustomerShell>;
}
