import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { Header } from "@/components/nav/header";
import { SourcingBoard } from "@/components/sourcing/sourcing-board";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { getSourcingResults } from "@/lib/paperclip";
import type { SourcingResult } from "@/lib/types";

export const revalidate = 30;

function getEmptyStateMessage(
  hasMimirCredentials: boolean,
  loadFailed: boolean
): { title: string; body: string } {
  if (loadFailed) {
    return {
      title: "Live feed unavailable",
      body: "The sourcing feed could not be loaded right now, so the page is intentionally showing no fabricated candidates.",
    };
  }

  if (!hasMimirCredentials) {
    return {
      title: "Mimir credentials missing",
      body: "No live sourcing candidates are configured for this environment yet, so the dashboard now shows an honest empty state instead of demo founders.",
    };
  }

  return {
    title: "No live candidates yet",
    body: "The live sourcing feed is connected, but no candidate records have been stored for this workspace yet.",
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

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={30_000} />
      <Header
        title="Sourcing Results"
        description="Live candidate discoveries only; demo prospects have been removed"
      />

      <Card className="border-[var(--ssg-green)]/20 bg-[var(--ssg-green)]/5 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--muted-foreground)]">
            This route now prefers truthful live sourcing records and will show an explicit empty state when no candidate feed is available.
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="info">30s Refresh</Badge>
            {candidates.length === 0 && <Badge variant="warning">Awaiting Live Feed</Badge>}
          </div>
        </div>
      </Card>

      {candidates.length > 0 ? (
        <SourcingBoard candidates={candidates} />
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
