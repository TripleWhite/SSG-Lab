import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { Header } from "@/components/nav/header";
import { SourcingBoard } from "@/components/sourcing/sourcing-board";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { getSourcingResults } from "@/lib/paperclip";
import { hasSupabaseCredentials } from "@/lib/supabase";
import type { SourcingResult } from "@/lib/types";
import { ArrowUpRight, PlugZap, Radar, ShieldAlert } from "lucide-react";
import Link from "next/link";

export const revalidate = 30;

function getEmptyStateMessage(
  hasSupabaseConfig: boolean,
  loadFailed: boolean
): {
  title: string;
  body: string;
  eyebrow: string;
  href: string;
  action: string;
  note: string;
  tone: "danger" | "warning" | "info";
  icon: typeof ShieldAlert;
} {
  if (loadFailed) {
    return {
      title: "Sourcing feed unavailable",
      body: "We could not load sourcing results right now. The list will refresh automatically when the feed is back.",
      eyebrow: "Refresh pending",
      href: "/pipeline",
      action: "View pipeline",
      note: "This page will repopulate after the next successful sourcing sync.",
      tone: "danger",
      icon: ShieldAlert,
    };
  }

  if (!hasSupabaseConfig) {
    return {
      title: "No sourcing data available yet",
      body: "This workspace is ready for sourcing, but candidate records have not started flowing into the dashboard yet.",
      eyebrow: "Awaiting first sync",
      href: "/pipeline",
      action: "View pipeline",
      note: "Candidate profiles will appear here as soon as the first sourcing import completes.",
      tone: "warning",
      icon: PlugZap,
    };
  }

  return {
    title: "No sourcing results yet",
    body: "The sourcing feed is connected, but there are no candidate records for this workspace yet.",
    eyebrow: "Ready for results",
    href: "/matching",
    action: "Open matching",
    note: "New candidate profiles will appear here automatically after each sourcing cycle.",
    tone: "info",
    icon: Radar,
  };
}

export default async function SourcingPage() {
  const hasSupabaseConfig = hasSupabaseCredentials();
  let candidates: SourcingResult[] = [];
  let loadFailed = false;

  try {
    candidates = await getSourcingResults();
  } catch {
    loadFailed = true;
  }

  const emptyState = getEmptyStateMessage(hasSupabaseConfig, loadFailed);
  const EmptyStateIcon = emptyState.icon;

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={30_000} />
      <Header
        title="Sourcing Results"
        description="Track sourced founders and companies as new opportunities are added."
        eyebrow="Founder Sourcing"
      />

      <Card className="overflow-hidden border-[var(--ssg-green)]/20 bg-[linear-gradient(135deg,rgba(100,254,186,0.08),rgba(19,24,24,0.96)_50%,rgba(10,10,15,0.98))] p-0">
        <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Sourcing Status</Badge>
              <Badge variant={candidates.length > 0 ? "success" : "warning"}>
                {candidates.length > 0 ? "Results Live" : "No Results Yet"}
              </Badge>
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--foreground)]">
                Current sourcing pipeline
              </p>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
                This view updates with sourced opportunities as soon as new
                founder and company records are available.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {candidates.length > 0 ? (
        <SourcingBoard candidates={candidates} />
      ) : (
        <Card className="overflow-hidden border-dashed border-[var(--border)]/80 bg-[linear-gradient(180deg,rgba(19,24,24,0.94),rgba(10,10,15,0.98))] p-0">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[auto,1fr,auto] lg:items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-[var(--border)] bg-black/20 text-[var(--ssg-green)]">
              <EmptyStateIcon size={24} />
            </div>
            <div className="space-y-3">
              <Badge variant={emptyState.tone}>{emptyState.eyebrow}</Badge>
              <div>
                <CardTitle className="mb-2 text-2xl">{emptyState.title}</CardTitle>
                <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
                  {emptyState.body}
                </p>
              </div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                {emptyState.note}
              </p>
            </div>
            <Link
              href={emptyState.href}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-black/20 px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[var(--ssg-green)]/40 hover:bg-[var(--card-hover)]"
            >
              {emptyState.action}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
