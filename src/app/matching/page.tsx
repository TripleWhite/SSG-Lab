import { Header } from "@/components/nav/header";
import { MatchCard } from "@/components/matching/match-card";

const MATCHES = [
  {
    id: "m-1",
    type: "supply-demand" as const,
    confidence: 92,
    status: "pending" as const,
    timestamp: "2h ago",
    sideA: {
      entityName: "DesignAI",
      description: "AI-powered design tool seeking enterprise customers",
    },
    sideB: {
      entityName: "BigCorp",
      description: "Fortune 500 evaluating AI design tooling for internal teams",
    },
    suggestion:
      "DesignAI's enterprise tier aligns closely with BigCorp's stated procurement criteria. A warm intro could accelerate their pilot timeline.",
  },
  {
    id: "m-2",
    type: "resource" as const,
    confidence: 88,
    status: "accepted" as const,
    timestamp: "5h ago",
    sideA: {
      entityName: "NeuralOps",
      description: "MLOps startup in need of cloud compute credits for training runs",
    },
    sideB: {
      entityName: "AWS Activate Program",
      description: "Offers up to $100k in cloud credits to qualifying startups",
      viaEmployee: "Alice Chen",
    },
    suggestion:
      "Alice has an existing relationship with the AWS Activate team and can facilitate a direct application for NeuralOps.",
  },
  {
    id: "m-3",
    type: "investor" as const,
    confidence: 78,
    status: "pending" as const,
    timestamp: "1d ago",
    sideA: {
      entityName: "FinanceAI",
      description: "B2B fintech raising a $3M seed round for AI-driven bookkeeping",
    },
    sideB: {
      entityName: "Sequoia Scout",
      description: "Active scout interested in early-stage fintech and AI infrastructure",
    },
    suggestion:
      "Sequoia Scout flagged interest in AI-native accounting tools last quarter. FinanceAI's traction metrics are within their typical seed thesis.",
  },
  {
    id: "m-4",
    type: "talent" as const,
    confidence: 72,
    status: "pending" as const,
    timestamp: "1d ago",
    sideA: {
      entityName: "RoboArm",
      description: "Robotics startup seeking a technical co-founder / CTO with ROS experience",
    },
    sideB: {
      entityName: "Dr. Li Wei",
      description: "Robotics PhD, ex-Boston Dynamics, currently exploring founding opportunities",
      viaEmployee: "Marcus Lee",
    },
    suggestion:
      "Dr. Li's background in manipulation systems maps directly to RoboArm's technical roadmap. Marcus can make the intro.",
  },
  {
    id: "m-5",
    type: "cross-project" as const,
    confidence: 75,
    status: "dismissed" as const,
    timestamp: "2d ago",
    sideA: {
      entityName: "HealthBot",
      description: "AI health assistant with de-identified hospital encounter data",
    },
    sideB: {
      entityName: "DataFlow",
      description: "Clinical analytics platform seeking longitudinal patient datasets",
    },
    suggestion:
      "HealthBot's dataset could accelerate DataFlow's model training. A data-sharing agreement may be feasible given both are SSG portfolio companies.",
  },
  {
    id: "m-6",
    type: "mentor" as const,
    confidence: 82,
    status: "accepted" as const,
    timestamp: "3d ago",
    sideA: {
      entityName: "EduTech",
      description: "K-12 learning platform struggling with B2B school district sales cycles",
    },
    sideB: {
      entityName: "James Wang",
      description: "Serial edtech founder, closed 40+ district deals, available for mentorship",
      viaEmployee: "Sarah Kim",
    },
    suggestion:
      "James has navigated the exact procurement bottlenecks EduTech faces. Sarah can facilitate a mentorship engagement.",
  },
];

export default function MatchingPage() {
  return (
    <div className="space-y-6">
      <Header
        title="Matching"
        description="Cross-employee, cross-project, and resource match discoveries"
      />

      <div className="space-y-4">
        {MATCHES.map((match) => (
          <MatchCard key={match.id} {...match} />
        ))}
      </div>
    </div>
  );
}
