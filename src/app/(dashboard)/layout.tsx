import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <Sidebar user={session.user} />
      <main className="px-4 pb-8 pt-16 md:ml-64 md:px-8 md:pt-8">{children}</main>
    </div>
  );
}
