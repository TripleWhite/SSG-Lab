import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { Header } from "@/components/nav/header";
import { MatchingBoard } from "@/components/matching/matching-board";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { getMatches } from "@/lib/paperclip";
import type { Match } from "@/lib/types";
import { ArrowUpRight, Radar, ShieldAlert } from "lucide-react";
import Link from "next/link";

export const revalidate = 30;

function getEmptyStateMessage(loadFailed: boolean): {
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
      title: "Live match feed unavailable",
      body: "The matching feed could not be loaded right now, so the page intentionally renders no synthetic matches.",
      eyebrow: "Feed interrupted",
      href: "/analytics",
      action: "Review analytics",
      note: "The dashboard will keep this blank until the next successful match sync.",
      tone: "danger",
      icon: ShieldAlert,
    };
  }

  return {
    title: "No live matches yet",
    body: "No match records have been written for this workspace yet. The dashboard now shows an honest empty state instead of fabricated pairings.",
    eyebrow: "Queue waiting",
    href: "/sourcing",
    action: "Open sourcing",
    note: "New match suggestions will land here as soon as a sourcing record is ready.",
    tone: "info",
    icon: Radar,
  };
}

export default async function MatchingPage() {
  let matches: Match[] = [];
  let loadFailed = false;

  try {
    matches = await getMatches();
  } catch {
    loadFailed = true;
  }

  const emptyState = getEmptyStateMessage(loadFailed);
  const EmptyStateIcon = emptyState.icon;

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={30_000} />
      <Header
        title="Matching"
        description="Live cross-project and resource matches only, with no demo pairings."
        eyebrow="Founder Matching"
      />

      <Card className="overflow-hidden border-[var(--ssg-green)]/20 bg-[linear-gradient(135deg,rgba(100,254,186,0.08),rgba(19,24,24,0.96)_50%,rgba(10,10,15,0.98))] p-0">
        <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Match Integrity</Badge>
              <Badge variant={matches.length > 0 ? "success" : "warning"}>
                {matches.length > 0 ? "Live Suggestions Active" : "No Live Suggestions"}
              </Badge>
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--foreground)]">
                Real match records only
              </p>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
                This page waits for actual match outputs and explains the empty
                state instead of padding the board with invented pairings.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="info">30s Refresh</Badge>
            {matches.length === 0 && <Badge variant="warning">Awaiting Feed</Badge>}
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
