import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Users, TrendingUp, Zap, MapPin } from "lucide-react";
import { Header } from "@/components/nav/header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getProject, getAllProjectIds } from "@/lib/projects";

export const revalidate = 60;

export async function generateStaticParams() {
  const ids = getAllProjectIds();
  return ids.map((id) => ({ projectId: id }));
}

const STAGE_LABELS: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" | "danger" }> = {
  invested: { label: "Invested", variant: "default" },
  lead: { label: "Lead", variant: "success" },
  screening: { label: "Screening", variant: "info" },
  "due-diligence": { label: "Due Diligence", variant: "warning" },
  passed: { label: "Passed", variant: "danger" },
  shelved: { label: "Shelved", variant: "danger" },
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = getProject(projectId);

  if (!project) {
    notFound();
  }

  const stageConfig = project.pipeline_stage
    ? (STAGE_LABELS[project.pipeline_stage] ?? { label: project.pipeline_stage, variant: "info" as const })
    : null;

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link
        href="/pipeline"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--ssg-green)]"
      >
        <ArrowLeft size={14} />
        Back to Pipeline
      </Link>

      <Header
        title={project.name}
        description={project.one_liner}
        eyebrow="Portfolio Company"
      />

      {/* Tag row */}
      <div className="flex flex-wrap items-center gap-2">
        {project.sector && <Badge variant="info">{project.sector}</Badge>}
        {project.category && project.category !== project.sector && (
          <Badge variant="info">{project.category}</Badge>
        )}
        {project.funding_round && <Badge variant="warning">{project.funding_round}</Badge>}
        {stageConfig && (
          <Badge variant={stageConfig.variant}>{stageConfig.label}</Badge>
        )}
        {project.investment_status && (
          <span className="inline-flex items-center border border-[var(--ssg-green)]/20 bg-[var(--ssg-green)]/5 px-2.5 py-0.5 text-xs font-medium text-[var(--ssg-green)]">
            {project.investment_status}
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content — 2/3 width */}
        <div className="space-y-6 lg:col-span-2">

          {/* Team */}
          {project.team && (project.team.ceo_founder || project.team.ceo_background || project.team.core_team) && (
            <Card>
              <div className="mb-4 flex items-center gap-2">
                <Users size={16} className="text-[var(--ssg-green)]" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Team
                </h2>
              </div>
              <div className="space-y-4">
                {project.team.ceo_founder && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                      CEO / Founder
                    </p>
                    <p className="text-base font-semibold text-[var(--foreground)]">
                      {project.team.ceo_founder}
                    </p>
                    {project.team.ceo_background && (
                      <p className="mt-1 text-sm text-[var(--muted-foreground)] leading-relaxed">
                        {project.team.ceo_background}
                      </p>
                    )}
                  </div>
                )}
                {project.team.core_team && (
                  <div className="border-t border-[var(--border)] pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                      Core Team
                    </p>
                    <p className="text-sm text-[var(--foreground)] leading-relaxed">
                      {project.team.core_team}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Product Highlights */}
          {project.product_highlights && project.product_highlights.length > 0 && (
            <Card>
              <div className="mb-4 flex items-center gap-2">
                <Zap size={16} className="text-[var(--ssg-green)]" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Product Highlights
                </h2>
              </div>
              <ul className="space-y-2">
                {project.product_highlights.map((highlight, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-[var(--ssg-green)]" />
                    <span className="text-sm text-[var(--foreground)] leading-relaxed">
                      {highlight}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Market */}
          {project.market && (
            <Card>
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-[var(--ssg-green)]" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Market
                </h2>
              </div>
              <p className="text-sm text-[var(--foreground)] leading-relaxed">
                {project.market}
              </p>
            </Card>
          )}
        </div>

        {/* Sidebar — 1/3 width */}
        <div className="space-y-6">

          {/* Current Progress */}
          {project.current_progress && (
            <Card className="border-[var(--ssg-green)]/20 bg-[var(--ssg-green)]/5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                Current Progress
              </p>
              <p className="text-sm text-[var(--foreground)] leading-relaxed">
                {project.current_progress}
              </p>
            </Card>
          )}

          {/* Demo */}
          {(project.demo_date || project.demo_event) && (
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays size={16} className="text-[var(--ssg-green)]" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Upcoming Demo
                </h2>
              </div>
              {project.demo_event && (
                <p className="font-semibold text-[var(--foreground)]">{project.demo_event}</p>
              )}
              {project.demo_date && (
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {formatDate(project.demo_date)}
                </p>
              )}
            </Card>
          )}

          {/* Source */}
          {(project.source_employee || project.source_date) && (
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <MapPin size={16} className="text-[var(--muted-foreground)]" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Source
                </h2>
              </div>
              <div className="space-y-1">
                {project.source_employee && (
                  <p className="text-sm text-[var(--foreground)]">
                    <span className="text-[var(--muted-foreground)]">Sourced by </span>
                    {project.source_employee}
                  </p>
                )}
                {project.source_date && (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {formatDate(project.source_date)}
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Last updated */}
          {project.updated_at && (
            <p className="text-xs text-[var(--muted-foreground)]">
              Updated {formatDate(project.updated_at)}
            </p>
          )}
        </div>
      </div>

      {/* Raw JSON — collapsible */}
      <details className="group border border-[var(--border)]">
        <summary className="cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] list-none flex items-center justify-between">
          <span>Raw Data</span>
          <span className="text-[var(--muted-foreground)] group-open:rotate-180 transition-transform">
            ▾
          </span>
        </summary>
        <div className="border-t border-[var(--border)] bg-[var(--background)] p-4">
          <pre className="overflow-x-auto text-xs text-[var(--muted-foreground)] leading-relaxed">
            {JSON.stringify(project, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}
