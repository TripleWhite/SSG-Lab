import { Header } from "@/components/nav/header";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { requireBoard } from "@/lib/auth";
import { getRuntimeSections, type RuntimeStatus } from "@/lib/runtime";

export const dynamic = "force-dynamic";

const statusMeta: Record<
  RuntimeStatus,
  { label: string; variant: "success" | "warning" | "danger" }
> = {
  configured: { label: "Configured", variant: "success" },
  partial: { label: "Partial", variant: "warning" },
  missing: { label: "Missing", variant: "danger" },
};

export default async function SettingsPage() {
  await requireBoard();
  const sections = getRuntimeSections();
  const totals = sections.flatMap((section) => section.checks);
  const configuredCount = totals.filter((check) => check.status === "configured").length;
  const blockedCount = totals.filter((check) => check.status !== "configured").length;

  return (
    <div className="space-y-8">
      <Header
        title="Settings"
        description="Runtime readiness for live data, auth, and deployment prerequisites"
        eyebrow="Runtime Checks"
      />

      <Card className="border-[var(--ssg-green)]/20 bg-[var(--ssg-green)]/5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Environment readiness</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              This page now reflects the actual server configuration instead of generic admin copy.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-[var(--muted-foreground)]">Configured</p>
              <p className="text-lg font-semibold text-[var(--ssg-green)]">{configuredCount}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--muted-foreground)]">Blocked</p>
              <p className="text-lg font-semibold text-red-300">{blockedCount}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardTitle className="mb-2">{section.title}</CardTitle>
            <p className="mb-5 text-sm text-[var(--muted-foreground)]">{section.description}</p>

            <div className="space-y-4">
              {section.checks.map((check) => {
                const meta = statusMeta[check.status];

                return (
                  <div
                    key={check.key}
                    className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">{check.title}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                          {check.description}
                        </p>
                      </div>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {check.envVars.map((envVar) => (
                        <Badge
                          key={envVar}
                          variant={check.missingVars.includes(envVar) ? "danger" : "success"}
                        >
                          {envVar}
                        </Badge>
                      ))}
                    </div>

                    {check.missingVars.length > 0 && (
                      <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                        Missing: {check.missingVars.join(", ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
