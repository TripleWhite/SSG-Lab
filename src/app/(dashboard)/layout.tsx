import { Sidebar } from "@/components/nav/sidebar";
import { requireSession } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex">
      <Sidebar userName={session.name} role={session.role} />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
