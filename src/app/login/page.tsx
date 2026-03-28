import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="bg-gradient-to-r from-[var(--ssg-green)] to-[var(--ssg-yellow)] bg-clip-text text-4xl font-bold text-transparent">
            SSG Accelerator
          </h1>
          <p className="mt-2 text-[var(--muted)]">Agent Dashboard</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8">
          <p className="mb-6 text-sm text-[var(--muted)]">Sign in to access your dashboard</p>
          <Button className="w-full">Sign in with Feishu</Button>
          <p className="mt-4 text-xs text-[var(--muted)]">Requires SSG Accelerator Feishu account</p>
        </div>
      </div>
    </div>
  );
}
