"use client";

import { useState } from "react";
import { CandidateCard } from "@/components/sourcing/candidate-card";
import type { SourcingResult } from "@/lib/types";

const ALL_FILTER = "All";

interface SourcingBoardProps {
  candidates: SourcingResult[];
}

export function SourcingBoard({ candidates }: SourcingBoardProps) {
  const [activeFilter, setActiveFilter] = useState<string>(ALL_FILTER);
  const filters = [ALL_FILTER, ...new Set(candidates.map((candidate) => candidate.domain))];
  const filtered =
    activeFilter === ALL_FILTER
      ? candidates
      : candidates.filter((candidate) => candidate.domain === activeFilter);

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all ${
              activeFilter === filter
                ? "border-[var(--ssg-green)]/40 bg-[var(--ssg-green)]/10 text-[var(--ssg-green)]"
                : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--ssg-green)]/30 hover:bg-[var(--card-hover)] hover:text-[var(--foreground)]"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-sm text-[var(--muted-foreground)]">
          No candidates match this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              founderName={candidate.founderName}
              company={candidate.companyName}
              domain={candidate.domain}
              stage={candidate.stage}
              relevanceScore={candidate.relevanceScore}
              status={candidate.status}
              matchReason={candidate.matchReason}
              sources={candidate.sources}
              contact={{
                email: candidate.contactEmail,
                twitter: candidate.contactTwitter,
                linkedin: candidate.contactLinkedin,
              }}
              requestedBy={candidate.requestedBy}
            />
          ))}
        </div>
      )}
    </>
  );
}
