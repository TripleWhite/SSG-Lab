import { Sidebar } from "@/components/nav/sidebar";
import { requireSession } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar userName={session.name} role={session.role} />
      <main className="min-w-0 flex-1 overflow-auto px-4 py-5 sm:px-6 sm:py-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
