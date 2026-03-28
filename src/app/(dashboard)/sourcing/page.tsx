import { Header } from "@/components/nav/header";
import { CandidateCard } from "@/components/sourcing/candidate-card";

const FILTER_PILLS = ["All", "AI Infra", "Fintech", "Design", "Health"] as const;

const CANDIDATES = [
  {
    id: "src-1",
    founderName: "张晨曦 (Alex Zhang)",
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
    requestedBy: "Sourcing Agent · 3 hours ago",
  },
  {
    id: "src-2",
    founderName: "林佳欣 (Jasmine Lin)",
    company: "InfraAI",
    domain: "AI Infra",
    stage: "Seed",
    relevanceScore: 78,
    status: "new" as const,
    matchReason:
      "Developer tooling for multi-cloud AI pipelines. Team of 4 ex-Alibaba Cloud engineers. Found via Xiaohongshu posts discussing GPU scheduling benchmarks — strong technical credibility signal.",
    sources: ["Xiaohongshu", "Twitter/X", "ProductHunt"],
    contact: {
      email: "jasmine@infraai.dev",
      twitter: "@jasminelindev",
    },
    requestedBy: "Sourcing Agent · 6 hours ago",
  },
  {
    id: "src-3",
    founderName: "陈思远 (Simon Chen)",
    company: "DesignAI",
    domain: "Design",
    stage: "Pre-Seed",
    relevanceScore: 92,
    status: "converted" as const,
    matchReason:
      "AI-native design collaboration tool with deep integration into Figma and Notion. 1,200 waitlist signups in 2 weeks. Founder has prior exit in SaaS design tools — exceptional product intuition and go-to-market clarity.",
    sources: ["AngelList", "Figma Community", "Twitter/X"],
    contact: {
      email: "simon@designai.so",
      twitter: "@simonchen_design",
      linkedin: "linkedin.com/in/simonchen-design",
    },
    requestedBy: "Matching Agent · 1 day ago",
  },
];

export default function SourcingPage() {
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
            className={
              pill === "All"
                ? "rounded-full px-4 py-1.5 text-sm font-medium transition-all bg-[var(--ssg-green)]/10 text-[var(--ssg-green)] ring-1 ring-[var(--ssg-green)]/40"
                : "rounded-full px-4 py-1.5 text-sm font-medium transition-all text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)] ring-1 ring-[var(--border)]"
            }
          >
            {pill}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {CANDIDATES.map((candidate) => (
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
          />
        ))}
      </div>
    </div>
  );
}
