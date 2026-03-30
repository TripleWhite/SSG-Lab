"use client";

import { useState } from "react";
import { MatchCard } from "@/components/matching/match-card";
import { formatRelativeTime } from "@/lib/format";
import type { Match } from "@/lib/types";

type MatchType = Match["type"];
type MatchStatus = Match["status"];

const TYPE_FILTERS: { value: MatchType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "supply-demand", label: "Supply-Demand" },
  { value: "resource", label: "Resource" },
  { value: "talent", label: "Talent" },
  { value: "investor", label: "Investor" },
  { value: "cross-project", label: "Cross-Project" },
  { value: "mentor", label: "Mentor" },
];

const STATUS_FILTERS: { value: MatchStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "dismissed", label: "Dismissed" },
];

interface MatchingBoardProps {
  matches: Match[];
}

export function MatchingBoard({ matches }: MatchingBoardProps) {
  const [activeType, setActiveType] = useState<MatchType | "all">("all");
  const [activeStatus, setActiveStatus] = useState<MatchStatus | "all">("all");

  const filtered = matches.filter((match) => {
    const typeMatch = activeType === "all" || match.type === activeType;
    const statusMatch = activeStatus === "all" || match.status === activeStatus;
    return typeMatch && statusMatch;
  });

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveType(filter.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeType === filter.value
                  ? "bg-[var(--ssg-green)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveStatus(filter.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeStatus === filter.value
                  ? "bg-[var(--ssg-green)]/10 text-[var(--ssg-green)] ring-1 ring-[var(--ssg-green)]/40"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] ring-1 ring-[var(--border)]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-sm text-[var(--muted-foreground)]">
          No matches found for the selected filters.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((match) => (
            <MatchCard
              key={match.id}
              type={match.type}
              confidence={match.confidence}
              status={match.status}
              timestamp={formatRelativeTime(match.createdAt)}
              sideA={{
                entityName: match.sideA.entity,
                description: match.sideA.description,
                viaEmployee: match.sideA.sourceEmployee,
              }}
              sideB={{
                entityName: match.sideB.entity,
                description: match.sideB.description,
                viaEmployee: match.sideB.sourceEmployee,
              }}
              suggestion={match.suggestion}
            />
          ))}
        </div>
      )}
    </>
  );
}
