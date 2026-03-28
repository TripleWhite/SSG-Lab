import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type CandidateStatus = "new" | "reviewed" | "converted" | "dismissed";

const statusConfig: Record<CandidateStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }> = {
  new: { label: "New", variant: "info" },
  reviewed: { label: "Reviewed", variant: "warning" },
  converted: { label: "Converted", variant: "success" },
  dismissed: { label: "Dismissed", variant: "danger" },
};

interface ContactInfo {
  email?: string;
  twitter?: string;
  linkedin?: string;
}

export interface CandidateCardProps {
  founderName: string;
  company: string;
  domain: string;
  stage: string;
  relevanceScore: number;
  status: CandidateStatus;
  matchReason: string;
  sources: string[];
  contact: ContactInfo;
  requestedBy: string;
  onCreateProject?: () => void;
  onDismiss?: () => void;
}

export function CandidateCard({
  founderName,
  company,
  domain,
  stage,
  relevanceScore,
  status,
  matchReason,
  sources,
  contact,
  requestedBy,
  onCreateProject,
  onDismiss,
}: CandidateCardProps) {
  const { label, variant } = statusConfig[status];
  const scoreColor =
    relevanceScore >= 90
      ? "text-[var(--ssg-green)]"
      : relevanceScore >= 75
      ? "text-[var(--ssg-yellow)]"
      : "text-amber-400";

  return (
    <Card hover>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold leading-tight">{founderName}</p>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
            {company} · {domain} · {stage}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`text-3xl font-bold tabular-nums leading-none ${scoreColor}`}>
            {relevanceScore}%
          </span>
          <Badge variant={variant}>{label}</Badge>
        </div>
      </div>

      <p className="mt-3 text-sm text-[var(--foreground)]">{matchReason}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-[var(--muted-foreground)]">Sources:</span>
        {sources.map((source) => (
          <Badge key={source} variant="default">
            {source}
          </Badge>
        ))}
      </div>

      <div className="mt-3 space-y-0.5 text-xs text-[var(--muted-foreground)]">
        {contact.email && (
          <p>
            <span className="text-[var(--foreground)]">Email</span> · {contact.email}
          </p>
        )}
        {contact.twitter && (
          <p>
            <span className="text-[var(--foreground)]">Twitter</span> · {contact.twitter}
          </p>
        )}
        {contact.linkedin && (
          <p>
            <span className="text-[var(--foreground)]">LinkedIn</span> · {contact.linkedin}
          </p>
        )}
        <p className="pt-1">
          <span className="text-[var(--foreground)]">Requested by</span> · {requestedBy}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button variant="outline" onClick={onCreateProject}>
          Create Project
        </Button>
        <Button variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </Card>
  );
}
