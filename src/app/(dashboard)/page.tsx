import {
  Activity,
  ArrowUpRight,
  Briefcase,
  Clock3,
  Radar,
  Target,
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/nav/header";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { SectionBadge } from "@/components/ui/section-badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatRelativeTime, truncateText } from "@/lib/format";
import {
  getBusinessProjects,
  getMatches,
  getSourcingResults,
} from "@/lib/paperclip";
import { hasSupabaseCredentials } from "@/lib/supabase";
import type { Match, Project, SourcingResult } from "@/lib/types";

export const revalidate = 30;

type SearchParamValue = string | string[] | undefined;

interface OverviewPageProps {
  searchParams?: Promise<{
    notice?: SearchParamValue;
  }>;
}

const CTA_LINK_CLASS =
  "inline-flex items-center gap-2 border border-[var(--ssg-green)]/24 bg-black/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--foreground)] transition-colors hover:border-[var(--ssg-green)]/50 hover:text-[var(--ssg-green)]";

const PROJECT_STATUS_LABELS: Record<Project["status"], string> = {
  contact: "Contact",
  diligence: "Diligence",
  decision: "Decision",
  acceleration: "Acceleration",
  exit: "Exit",
};

const PROJECT_STATUS_VARIANTS: Record<
  Project["status"],
  "default" | "success" | "warning" | "info"
> = {
  contact: "info",
  diligence: "warning",
  decision: "default",
  acceleration: "success",
  exit: "default",
};

const SOURCING_STATUS_LABELS: Record<SourcingResult["status"], string> = {
  new: "New",
  reviewed: "Reviewed",
  converted: "Converted",
  dismissed: "Dismissed",
};

const SOURCING_STATUS_VARIANTS: Record<
  SourcingResult["status"],
  "default" | "success" | "warning" | "info"
> = {
  new: "warning",
  reviewed: "info",
  converted: "success",
  dismissed: "default",
};

const MATCH_STATUS_LABELS: Record<Match["status"], string> = {
  pending: "Pending",
  accepted: "Accepted",
  dismissed: "Dismissed",
};

const MATCH_STATUS_VARIANTS: Record<
  Match["status"],
  "default" | "success" | "warning"
> = {
  pending: "warning",
  accepted: "success",
  dismissed: "default",
};

const PORTFOLIO_STAGE_META = [
  { key: "contact", label: "Contact", color: "var(--ssg-green)" },
  { key: "diligence", label: "Diligence", color: "var(--ssg-yellow)" },
  { key: "decision", label: "Decision", color: "#38bdf8" },
  { key: "acceleration", label: "Acceleration", color: "#a78bfa" },
  { key: "exit", label: "Exit", color: "#f97316" },
] as const;

function readSearchParam(value: SearchParamValue): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function buildPortfolioStageMix(projects: Project[]) {
  return PORTFOLIO_STAGE_META.map((entry) => ({
    label: entry.label,
    color: entry.color,
    count: projects.filter((project) => project.status === entry.key).length,
  }));
}

function getOverviewState(
  hasSupabaseConfig: boolean,
  loadFailed: boolean,
  hasBusinessData: boolean,
) {
  if (loadFailed) {
    return {
      title: "Business feed refresh pending",
      body: "Some portfolio records could not be loaded right now. The overview will refresh automatically when the business feed responds again.",
      badge: "Refresh Pending",
      tone: "warning" as const,
    };
  }

  if (!hasSupabaseConfig) {
    return {
      title: "Workspace ready for first sync",
      body: "The dashboard shell is live, but portfolio, sourcing, and matching records have not been connected for this workspace yet.",
      badge: "Awaiting First Sync",
      tone: "warning" as const,
    };
  }

  if (!hasBusinessData) {
    return {
      title: "No business records yet",
      body: "The business data feed is connected, but there are no sourcing results, portfolio companies, or match suggestions in this workspace yet.",
      badge: "Ready for First Records",
      tone: "info" as const,
    };
  }

  return {
    title: "Live business pipeline",
    body: "Overview is now driven by portfolio companies, sourcing results, and match suggestions instead of internal delivery tasks.",
    badge: "Live Business Data",
    tone: "success" as const,
  };
}

function renderEmptyState(
  title: string,
  body: string,
  href: string,
  action: string,
) {
  return (
    <div className="mt-5 border border-dashed border-[var(--border)]/80 bg-black/20 p-5">
      <Badge variant="info">Awaiting Records</Badge>
      <p className="mt-4 text-lg font-bold text-[var(--foreground)]">{title}</p>
      <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--muted-foreground)]">
        {body}
      </p>
      <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--ssg-green)] transition-colors hover:text-[var(--ssg-green)]/80">
        {action}
        <ArrowUpRight size={14} />
      </Link>
    </div>
  );
}

export default async function OverviewPage({
  searchParams,
}: OverviewPageProps) {
  const params = (await searchParams) ?? {};
  const notice = readSearchParam(params.notice);
  const hasSupabaseConfig = hasSupabaseCredentials();

  const [projectsResult, sourcingResult, matchesResult] =
    await Promise.allSettled([
      getBusinessProjects(),
      getSourcingResults(),
      getMatches(),
    ]);

  const projects =
    projectsResult.status === "fulfilled" ? projectsResult.value : [];
  const sourcingResults =
    sourcingResult.status === "fulfilled" ? sourcingResult.value : [];
  const matches = matchesResult.status === "fulfilled" ? matchesResult.value : [];

  const loadFailed =
    projectsResult.status === "rejected" ||
    sourcingResult.status === "rejected" ||
    matchesResult.status === "rejected";

  const hasBusinessData =
    projects.length > 0 || sourcingResults.length > 0 || matches.length > 0;
  const overviewState = getOverviewState(
    hasSupabaseConfig,
    loadFailed,
    hasBusinessData,
  );

  const activeProjects = projects.filter((project) => project.status !== "exit");
  const followUpsDue = projects.filter((project) => {
    if (!project.nextFollowUp) {
      return false;
    }

    return new Date(project.nextFollowUp).getTime() <= Date.now();
  }).length;
  const newSourcingResults = sourcingResults.filter(
    (result) => result.status === "new",
  ).length;
  const pendingMatches = matches.filter((match) => match.status === "pending");
  const highConfidenceMatches = matches.filter((match) => match.confidence >= 80);

  const recentProjects = [...projects]
    .sort(
      (left, right) =>
        new Date(right.lastActivity).getTime() -
        new Date(left.lastActivity).getTime(),
    )
    .slice(0, 4);
  const recentSourcingResults = [...sourcingResults]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .slice(0, 4);
  const recentMatches = [...matches]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .slice(0, 4);

  const stageMix = buildPortfolioStageMix(projects);
  const stageMixMax = Math.max(...stageMix.map((stage) => stage.count), 1);

  const freshnessRows = [
    {
      label: "Portfolio",
      value:
        recentProjects[0]?.lastActivity
          ? formatRelativeTime(recentProjects[0].lastActivity)
          : "Pending",
    },
    {
      label: "Sourcing",
      value:
        recentSourcingResults[0]?.createdAt
          ? formatRelativeTime(recentSourcingResults[0].createdAt)
          : "Pending",
    },
    {
      label: "Matching",
      value:
        recentMatches[0]?.createdAt
          ? formatRelativeTime(recentMatches[0].createdAt)
          : "Pending",
    },
    {
      label: "Follow-ups",
      value:
        projects.length === 0
          ? "Pending"
          : followUpsDue > 0
            ? `${followUpsDue} due now`
            : "None overdue",
    },
  ];

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={30_000} />
      <Header
        title="Overview"
        description="Live sourcing, matching, and portfolio signals for the SSG business pipeline."
        eyebrow="Portfolio Command"
      />

      {notice === "board_access_required" && (
        <Card className="border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-200">
                Board access required
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Analytics and Settings are limited to mapped board users. Add{" "}
                <span className="font-mono text-xs">BOARD_FEISHU_OPEN_IDS</span>{" "}
                if this account should retain board-level access.
              </p>
            </div>
            <Badge variant="warning">Restricted Route</Badge>
          </div>
        </Card>
      )}

      <Card className="border-[var(--ssg-green)]/20 bg-[linear-gradient(135deg,rgba(100,254,186,0.08),rgba(19,24,24,0.96)_50%,rgba(10,10,15,0.98))] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Business Status</Badge>
              <Badge variant={overviewState.tone}>{overviewState.badge}</Badge>
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--foreground)]">
                {overviewState.title}
              </p>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
                {overviewState.body}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/pipeline" className={CTA_LINK_CLASS}>
              打开项目池
              <ArrowUpRight size={14} />
            </Link>
            <Link href="/sourcing" className={CTA_LINK_CLASS}>
              查看线索
              <ArrowUpRight size={14} />
            </Link>
            <Link href="/matching" className={CTA_LINK_CLASS}>
              查看匹配
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </Card>

      <div className="animate-fade-in grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tracked Companies"
          value={projects.length}
          trend={
            projects.length > 0
              ? `${activeProjects.length} active in pipeline`
              : "Waiting for first portfolio record"
          }
          icon={<Briefcase size={20} />}
          animated
        />
        <StatCard
          label="Sourcing Leads"
          value={sourcingResults.length}
          trend={
            sourcingResults.length > 0
              ? `${newSourcingResults} ready for review`
              : "Waiting for first sourcing result"
          }
          icon={<Radar size={20} />}
          animated
        />
        <StatCard
          label="Pending Matches"
          value={pendingMatches.length}
          trend={
            matches.length > 0
              ? `${highConfidenceMatches.length} high-confidence suggestions`
              : "No match suggestions yet"
          }
          icon={<Target size={20} />}
          animated
        />
        <StatCard
          label="Follow-ups Due"
          value={followUpsDue}
          trend={
            projects.length > 0
              ? `${projects.length} portfolio companies tracked`
              : "No follow-up schedule yet"
          }
          icon={<Clock3 size={20} />}
          animated
        />
      </div>

      <div
        className="animate-fade-in grid gap-6 xl:grid-cols-[1.05fr_1fr_1fr]"
        style={{ animationDelay: "0.1s" }}
      >
        <Card className="border-[var(--ssg-green)]/20 bg-[linear-gradient(180deg,rgba(19,24,24,0.98),rgba(10,10,15,0.98))]">
          <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SectionBadge>Sourcing Feed</SectionBadge>
              <CardTitle className="mt-4 text-2xl">最新线索</CardTitle>
              <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--muted-foreground)]">
                展示最近进入工作台的 founder 和 company 线索，方便快速判断下一步是否进入匹配或跟进。
              </p>
            </div>
            <Link href="/sourcing" className={CTA_LINK_CLASS}>
              打开线索列表
              <ArrowUpRight size={14} />
            </Link>
          </div>

          {recentSourcingResults.length > 0 ? (
            <ul className="mt-5 space-y-4">
              {recentSourcingResults.map((result) => (
                <li
                  key={result.id}
                  className="border-l border-[var(--ssg-green)]/30 pl-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {result.companyName}
                    </p>
                    <Badge variant={SOURCING_STATUS_VARIANTS[result.status]}>
                      {SOURCING_STATUS_LABELS[result.status]}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    {result.founderName} · {result.stage} · {result.domain}
                  </p>
                  <p className="mt-2 text-sm text-[var(--foreground)]">
                    {truncateText(result.matchReason, 96)}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                    {result.relevanceScore}% fit ·{" "}
                    {(result.sources[0] ?? "Business feed").replace(/\s+/g, " ")} ·{" "}
                    {formatRelativeTime(result.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            renderEmptyState(
              "No sourcing results yet",
              "New founder and company profiles will appear here as soon as the first sourcing import completes.",
              "/sourcing",
              "Open sourcing",
            )
          )}
        </Card>

        <Card>
          <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SectionBadge>Portfolio Tracker</SectionBadge>
              <CardTitle className="mt-4 text-2xl">项目池</CardTitle>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                用业务项目视角查看当前 portfolio 状态、阶段和最近活动，而不是内部交付任务。
              </p>
            </div>
            <Link href="/pipeline" className={CTA_LINK_CLASS}>
              打开项目池
              <ArrowUpRight size={14} />
            </Link>
          </div>

          {recentProjects.length > 0 ? (
            <ul className="mt-5 space-y-4">
              {recentProjects.map((project) => (
                <li key={project.id} className="border-l border-[var(--border)] pl-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {project.companyName}
                    </p>
                    <Badge variant={PROJECT_STATUS_VARIANTS[project.status]}>
                      {PROJECT_STATUS_LABELS[project.status]}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    {project.founderName} · {project.stage}
                  </p>
                  <p className="mt-2 text-sm text-[var(--foreground)]">
                    {truncateText(project.description, 96)}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                    {project.nextFollowUp
                      ? `Follow-up ${formatRelativeTime(project.nextFollowUp)}`
                      : `Updated ${formatRelativeTime(project.lastActivity)}`}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            renderEmptyState(
              "No portfolio companies yet",
              "Tracked companies and portfolio follow-up dates will show up here once the first business project is added.",
              "/pipeline",
              "Open pipeline",
            )
          )}
        </Card>

        <Card>
          <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SectionBadge>Match Queue</SectionBadge>
              <CardTitle className="mt-4 text-2xl">最近匹配</CardTitle>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                聚合当前最值得看的资源匹配和引荐建议，优先暴露业务机会而不是内部自动化日志。
              </p>
            </div>
            <Link href="/matching" className={CTA_LINK_CLASS}>
              打开匹配板
              <ArrowUpRight size={14} />
            </Link>
          </div>

          {recentMatches.length > 0 ? (
            <ul className="mt-5 space-y-4">
              {recentMatches.map((match) => (
                <li key={match.id} className="border-l border-[var(--border)] pl-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {match.sideA.entity}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={MATCH_STATUS_VARIANTS[match.status]}>
                        {MATCH_STATUS_LABELS[match.status]}
                      </Badge>
                      <Badge variant="info">{match.confidence}%</Badge>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    匹配对象 · {match.sideB.entity}
                  </p>
                  <p className="mt-2 text-sm text-[var(--foreground)]">
                    {truncateText(match.suggestion, 96)}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                    {formatRelativeTime(match.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            renderEmptyState(
              "No match suggestions yet",
              "Suggested introductions and partner matches will appear here as soon as the workspace has sourcing and resource records to compare.",
              "/matching",
              "Open matching",
            )
          )}
        </Card>
      </div>

      <div
        className="animate-fade-in grid gap-6 xl:grid-cols-[1fr_0.95fr]"
        style={{ animationDelay: "0.2s" }}
      >
        <Card>
          <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SectionBadge>Stage Mix</SectionBadge>
              <CardTitle className="mt-4 text-2xl">项目阶段分布</CardTitle>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                通过 business pipeline 阶段分布快速判断工作重心是线索、尽调、决策还是加速。
              </p>
            </div>
            <Link href="/pipeline" className={CTA_LINK_CLASS}>
              查看全部阶段
              <ArrowUpRight size={14} />
            </Link>
          </div>

          {projects.length > 0 ? (
            <ul className="mt-5 space-y-4">
              {stageMix.map((stage) => (
                <li key={stage.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">
                      {stage.label}
                    </span>
                    <span className="font-medium text-[var(--foreground)]">
                      {stage.count}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden bg-[var(--border)]">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${(stage.count / stageMixMax) * 100}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            renderEmptyState(
              "No pipeline stages yet",
              "Stage coverage will render here after the first portfolio companies are synchronized into the workspace.",
              "/pipeline",
              "Open pipeline",
            )
          )}
        </Card>

        <Card>
          <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SectionBadge>Freshness</SectionBadge>
              <CardTitle className="mt-4 text-2xl">数据新鲜度</CardTitle>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                观察业务数据最近一次更新时间，确认 overview 看到的是 live business feed，而不是静态样例。
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-[var(--border)] bg-black/20 text-[var(--ssg-green)]">
              <Activity size={18} />
            </div>
          </div>

          <ul className="mt-5 space-y-4">
            {freshnessRows.map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between border-b border-[var(--border)]/60 pb-3 last:border-b-0 last:pb-0"
              >
                <span className="text-sm text-[var(--muted-foreground)]">
                  {row.label}
                </span>
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {row.value}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <Badge variant={overviewState.tone}>{overviewState.badge}</Badge>
            <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
              {overviewState.body}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
