"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/nav/header";
import { CandidateCard } from "@/components/sourcing/candidate-card";
import { ToastContainer, showToast } from "@/components/ui/toast";

const FILTER_PILLS = ["All", "AI Infra", "Fintech", "Design", "Health"] as const;
type FilterPill = (typeof FILTER_PILLS)[number];

const CANDIDATES = [
  {
    id: "src-1",
    founderName: "\u5f20\u6668\u66e6 (Alex Zhang)",
    company: "NeuralOps",
    domain: "AI Infra",
    stage: "Pre-Seed",
    relevanceScore: 85,
    status: "new" as const,
    matchReason:
      "Strong alignment with SSG thesis: GPU orchestration layer targeting LLM inference cost reduction. Founder previously led infra at Bytedance. 2 warm intros available via LP network.",
    sources: ["YC Alumni Network", "LinkedIn", "GitHub"],
    contact: {
      email: "alex@neuralops.ai",
      twitter: "@alexzhang_ai",
      linkedin: "linkedin.com/in/alexzhang-ai",
    },
    requestedBy: "Sourcing Agent \u00b7 3 hours ago",
  },
  {
    id: "src-2",
    founderName: "\u6797\u4f73\u6b23 (Jasmine Lin)",
    company: "InfraAI",
    domain: "AI Infra",
    stage: "Seed",
    relevanceScore: 78,
    status: "new" as const,
    matchReason:
      "Developer tooling for multi-cloud AI pipelines. Team of 4 ex-Alibaba Cloud engineers. Found via Xiaohongshu posts discussing GPU scheduling benchmarks \u2014 strong technical credibility signal.",
    sources: ["Xiaohongshu", "Twitter/X", "ProductHunt"],
    contact: {
      email: "jasmine@infraai.dev",
      twitter: "@jasminelindev",
    },
    requestedBy: "Sourcing Agent \u00b7 6 hours ago",
  },
  {
    id: "src-3",
    founderName: "\u9648\u601d\u8fdc (Simon Chen)",
    company: "DesignAI",
    domain: "Design",
    stage: "Pre-Seed",
    relevanceScore: 92,
    status: "converted" as const,
    matchReason:
      "AI-native design collaboration tool with deep integration into Figma and Notion. 1,200 waitlist signups in 2 weeks. Founder has prior exit in SaaS design tools \u2014 exceptional product intuition and go-to-market clarity.",
    sources: ["AngelList", "Figma Community", "Twitter/X"],
    contact: {
      email: "simon@designai.so",
      twitter: "@simonchen_design",
      linkedin: "linkedin.com/in/simonchen-design",
    },
    requestedBy: "Matching Agent \u00b7 1 day ago",
  },
  {
    id: "src-4",
    founderName: "\u8d75\u5a77 (Tina Zhao)",
    company: "PayNext",
    domain: "Fintech",
    stage: "Pre-Seed",
    relevanceScore: 74,
    status: "new" as const,
    matchReason:
      "Cross-border payment rails for Southeast Asia micro-merchants. Ex-Stripe engineer with deep payment infrastructure knowledge. Growing 15% WoW in GMV.",
    sources: ["Twitter/X", "TechCrunch", "AngelList"],
    contact: {
      email: "tina@paynext.io",
      twitter: "@tinazhao_pay",
    },
    requestedBy: "Sourcing Agent \u00b7 8 hours ago",
  },
  {
    id: "src-5",
    founderName: "\u5468\u660e (Mark Zhou)",
    company: "VitaLens",
    domain: "Health",
    stage: "Seed",
    relevanceScore: 81,
    status: "new" as const,
    matchReason:
      "AI-powered medical imaging analysis for early cancer detection. Published 3 papers in Nature Medicine. Partnership with 2 tier-1 hospitals for clinical validation.",
    sources: ["PubMed", "LinkedIn", "Conference"],
    contact: {
      email: "mark@vitalens.health",
      linkedin: "linkedin.com/in/markzhou-med",
    },
    requestedBy: "Sourcing Agent \u00b7 1 day ago",
  },
];

export default function SourcingPage() {
  const [activePill, setActivePill] = useState<FilterPill>("All");

  const filtered = useMemo(() => {
    if (activePill === "All") return CANDIDATES;
    return CANDIDATES.filter((c) => c.domain === activePill);
  }, [activePill]);

  return (
    <div>
      <Header
        title="Sourcing Results"
        description="AI-surfaced candidates matched to SSG investment thesis"
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTER_PILLS.map((pill) => (
          <button
            key={pill}
            onClick={() => setActivePill(pill)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              activePill === pill
                ? "bg-[var(--ssg-green)]/10 text-[var(--ssg-green)] ring-1 ring-[var(--ssg-green)]/40"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)] ring-1 ring-[var(--border)]"
            }`}
          >
            {pill}
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
              company={candidate.company}
              domain={candidate.domain}
              stage={candidate.stage}
              relevanceScore={candidate.relevanceScore}
              status={candidate.status}
              matchReason={candidate.matchReason}
              sources={candidate.sources}
              contact={candidate.contact}
              requestedBy={candidate.requestedBy}
              onCreateProject={() =>
                showToast(`Project created for ${candidate.company}`)
              }
              onDismiss={() =>
                showToast("Candidate dismissed")
              }
            />
          ))}
        </div>
      )}

      <ToastContainer />
    </div>
  );
}
