import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { Header } from "@/components/nav/header";
import { SourcingBoard } from "@/components/sourcing/sourcing-board";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { getSourcingResults } from "@/lib/paperclip";
import type { SourcingResult } from "@/lib/types";
import { ArrowUpRight, PlugZap, Radar, ShieldAlert } from "lucide-react";
import Link from "next/link";

export const revalidate = 30;

function getEmptyStateMessage(
  hasMimirCredentials: boolean,
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
      title: "Live feed unavailable",
      body: "The sourcing feed could not be loaded right now, so the page is intentionally showing no fabricated candidates.",
      eyebrow: "Feed interrupted",
      href: "/analytics",
      action: "Review analytics",
      note: "The list stays empty until the next successful Paperclip sync.",
      tone: "danger",
      icon: ShieldAlert,
    };
  }

  if (!hasMimirCredentials) {
    return {
      title: "Mimir credentials missing",
      body: "No live sourcing candidates are configured for this environment yet, so the dashboard now shows an honest empty state instead of demo founders.",
      eyebrow: "Setup required",
      href: "/settings",
      action: "Open settings",
      note: "Connect the sourcing integration before expecting candidate rows here.",
      tone: "warning",
      icon: PlugZap,
    };
  }

  return {
    title: "No live candidates yet",
    body: "The live sourcing feed is connected, but no candidate records have been stored for this workspace yet.",
    eyebrow: "Feed ready",
    href: "/matching",
    action: "Open matching",
    note: "As soon as Paperclip stores a candidate result, it will appear here on the next refresh.",
    tone: "info",
    icon: Radar,
  };
}

export default async function SourcingPage() {
  const hasMimirCredentials = Boolean(process.env.MIMIR_API_KEY);
  let candidates: SourcingResult[] = [];
  let loadFailed = false;

  try {
    candidates = await getSourcingResults();
  } catch {
    loadFailed = true;
  }

  const emptyState = getEmptyStateMessage(hasMimirCredentials, loadFailed);
  const EmptyStateIcon = emptyState.icon;

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={30_000} />
      <Header
        title="Sourcing Results"
        description="Live candidate discoveries only; demo prospects have been removed"
      />

      <Card className="overflow-hidden border-[var(--ssg-green)]/20 bg-[linear-gradient(135deg,rgba(100,254,186,0.08),rgba(19,24,24,0.96)_50%,rgba(10,10,15,0.98))] p-0">
        <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Feed Integrity</Badge>
              <Badge variant={candidates.length > 0 ? "success" : "warning"}>
                {candidates.length > 0 ? "Live Records Active" : "No Live Records"}
              </Badge>
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--foreground)]">
                Truthful sourcing records only
              </p>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
                Demo prospects are gone. This page either shows stored live candidates or a
                clear reason the list is blank.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="info">30s Refresh</Badge>
            {candidates.length === 0 && <Badge variant="warning">Awaiting Feed</Badge>}
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
