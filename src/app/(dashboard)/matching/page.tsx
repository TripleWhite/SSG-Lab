import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { Header } from "@/components/nav/header";
import { MatchingBoard } from "@/components/matching/matching-board";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { getMatches } from "@/lib/paperclip";
import type { Match } from "@/lib/types";

export const revalidate = 30;

function getEmptyStateMessage(loadFailed: boolean): { title: string; body: string } {
  if (loadFailed) {
    return {
      title: "Live match feed unavailable",
      body: "The matching feed could not be loaded right now, so the page intentionally renders no synthetic matches.",
    };
  }

  return {
    title: "No live matches yet",
    body: "No match records have been written for this workspace yet. The dashboard now shows an honest empty state instead of fabricated pairings.",
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

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={30_000} />
      <Header
        title="Matching"
        description="Live cross-project and resource matches only; demo pairings have been removed"
      />

      <Card className="border-[var(--ssg-green)]/20 bg-[var(--ssg-green)]/5 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--muted-foreground)]">
            This route now waits for real match records and no longer fills the dashboard with invented suggestions.
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="info">30s Refresh</Badge>
            {matches.length === 0 && <Badge variant="warning">Awaiting Live Feed</Badge>}
          </div>
        </div>
      </Card>

      {matches.length > 0 ? (
        <MatchingBoard matches={matches} />
      ) : (
        <Card className="border-dashed border-[var(--border)]/80 py-12 text-center">
          <CardTitle className="mb-2">{emptyState.title}</CardTitle>
          <p className="mx-auto max-w-2xl text-sm text-[var(--muted-foreground)]">
            {emptyState.body}
          </p>
        </Card>
      )}
    </div>
  );
}
