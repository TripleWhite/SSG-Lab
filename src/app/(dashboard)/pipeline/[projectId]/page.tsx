import { DynamicPage } from "@/components/dynamic-page";
import { getProject, getAllProjectIds, type ProjectData } from "@/lib/projects";
import { Header } from "@/components/nav/header";
import { Card } from "@/components/ui/card";
import type { PageData, PageBlock } from "@/components/dynamic-page/types";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const revalidate = 60;

export async function generateStaticParams() {
  const ids = getAllProjectIds();
  return ids.map((projectId) => ({ projectId }));
}

function buildProjectPageData(project: ProjectData, id: string): PageData {
  const name = project.name ?? id;
  const oneLiner = project.one_liner ?? "";
  const team = project.team;
  const highlights = project.product_highlights ?? [];
  const market = project.market ?? "";
  const progress = project.current_progress ?? "";
  const demoDate = project.demo_date ?? "";
  const demoEvent = project.demo_event ?? "";
  const status = project.investment_status ?? "";
  const round = project.funding_round ?? "";
  const sector = project.sector ?? "";
  const source = project.source_employee ?? "";
  const sourceDate = project.source_date ?? "";

  const blocks: PageBlock[] = [];

  if (demoDate) {
    blocks.push({
      type: "alert",
      severity: "orange",
      title: `Demo: ${demoEvent || "Upcoming"} — ${demoDate}`,
      body: progress || undefined,
    });
  }

  const detailFields: Array<{ label: string; value: string; type?: "text" | "badge"; badge_variant?: "default" | "success" | "warning" | "danger" | "info" }> = [];
  if (status) detailFields.push({ label: "Investment Status", value: status, type: "badge", badge_variant: "success" });
  if (round) detailFields.push({ label: "Funding Round", value: round, type: "badge", badge_variant: "info" });
  if (sector) detailFields.push({ label: "Sector", value: sector });
  if (market) detailFields.push({ label: "Market", value: market });
  if (source) detailFields.push({ label: "Source Employee", value: source });
  if (sourceDate) detailFields.push({ label: "Source Date", value: sourceDate });
  if (demoDate) detailFields.push({ label: "Demo Date", value: demoDate });
  if (demoEvent) detailFields.push({ label: "Demo Event", value: demoEvent });

  if (detailFields.length > 0) {
    blocks.push({ type: "section", title: "Key Details", blocks: [{ type: "detail", fields: detailFields }] });
  }

  if (team) {
    const teamFields: Array<{ label: string; value: string }> = [];
    if (team.ceo_founder) teamFields.push({ label: "CEO / Founder", value: team.ceo_founder });
    if (team.ceo_background) teamFields.push({ label: "Background", value: team.ceo_background });
    if (team.core_team) teamFields.push({ label: "Core Team", value: team.core_team });
    if (teamFields.length > 0) {
      blocks.push({ type: "section", title: "Team", blocks: [{ type: "detail", fields: teamFields }] });
    }
  }

  if (highlights.length > 0) {
    blocks.push({
      type: "section",
      title: "Product Highlights",
      blocks: [{ type: "text", content: highlights.map((h) => `• ${h}`).join("\n") }],
    });
  }

  if (progress && !demoDate) {
    blocks.push({ type: "section", title: "Current Progress", blocks: [{ type: "text", content: progress }] });
  }

  return {
    page: `project-${id}`,
    title: name,
    subtitle: oneLiner,
    eyebrow: [sector, round].filter(Boolean).join(" · "),
    generated_at: project.updated_at ?? new Date().toISOString(),
    blocks,
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProject(projectId);

  if (!project) {
    return (
      <div className="space-y-6">
        <Header title="Project Not Found" eyebrow="Pipeline" />
        <Card>
          <p className="text-[var(--muted-foreground)]">
            No project data found for <code className="text-sm">{projectId}</code>.
          </p>
        </Card>
      </div>
    );
  }

  const pageData = buildProjectPageData(project, projectId);
  return (
    <div className="space-y-6">
      <Link
        href="/pipeline"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--ssg-green)]"
      >
        <ArrowLeft size={14} />
        Back to Pipeline
      </Link>
      <DynamicPage data={pageData} />
    </div>
  );
}
