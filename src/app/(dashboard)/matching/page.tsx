import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { Header } from "@/components/nav/header";
import { MatchingBoard } from "@/components/matching/matching-board";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { getMatches } from "@/lib/paperclip";
import { hasSupabaseCredentials } from "@/lib/supabase";
import type { Match } from "@/lib/types";
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
  if (!hasSupabaseConfig) {
    return {
      title: "No matching data available yet",
      body: "The matching board will populate after the first sourcing and resource records are ready for this workspace.",
      eyebrow: "Awaiting first sync",
      href: "/sourcing",
      action: "Open sourcing",
      note: "Suggested introductions will appear here automatically once new records are processed.",
      tone: "warning",
      icon: PlugZap,
    };
  }

  if (loadFailed) {
    return {
      title: "Matching feed unavailable",
      body: "We could not load match suggestions right now. The board will refresh automatically when the feed is back.",
      eyebrow: "Refresh pending",
      href: "/pipeline",
      action: "View pipeline",
      note: "Suggested introductions will return after the next successful match sync.",
      tone: "danger",
      icon: ShieldAlert,
    };
  }

  return {
    title: "No matches yet",
    body: "No match suggestions have been created for this workspace yet.",
    eyebrow: "Queue ready",
    href: "/sourcing",
    action: "Open sourcing",
    note: "Suggested introductions will land here as soon as new candidate records are ready.",
    tone: "info",
    icon: Radar,
  };
}

export default async function MatchingPage() {
  const hasSupabaseConfig = hasSupabaseCredentials();
  let matches: Match[] = [];
  let loadFailed = false;

  try {
    matches = await getMatches();
  } catch {
    loadFailed = true;
  }

  const emptyState = getEmptyStateMessage(hasSupabaseConfig, loadFailed);
  const EmptyStateIcon = emptyState.icon;

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={30_000} />
      <Header
        title="Matching"
        description="Review current project and resource matches for this workspace."
        eyebrow="Founder Matching"
      />

      <Card className="overflow-hidden border-[var(--ssg-green)]/20 bg-[linear-gradient(135deg,rgba(100,254,186,0.08),rgba(19,24,24,0.96)_50%,rgba(10,10,15,0.98))] p-0">
        <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Match Status</Badge>
              <Badge variant={matches.length > 0 ? "success" : "warning"}>
                {matches.length > 0 ? "Suggestions Live" : "No Suggestions Yet"}
              </Badge>
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--foreground)]">
                Current match suggestions
              </p>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
                This board fills with suggested introductions once sourcing and
                resource records are available for review.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {matches.length > 0 ? (
        <MatchingBoard matches={matches} />
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
