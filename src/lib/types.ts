export interface Agent {
  id: string;
  name: string;
  role: string;
  status: "active" | "paused" | "idle" | "running" | "error";
  adapterType: string;
  lastHeartbeat?: string;
  nextHeartbeat?: string;
  todayRuns: number;
  tokenUsageToday: number;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: "contact" | "diligence" | "decision" | "acceleration" | "exit";
  priority: "critical" | "high" | "medium" | "low";
  assigneeEmployee: string;
  founderName: string;
  companyName: string;
  stage: string;
  daysInStage: number;
  healthStatus: "on-track" | "needs-attention" | "at-risk" | "overdue";
  lastActivity: string;
  nextFollowUp?: string;
  tags: string[];
}

export interface SourcingResult {
  id: string;
  founderName: string;
  companyName: string;
  domain: string;
  stage: string;
  relevanceScore: number;
  sources: string[];
  contactEmail?: string;
  contactTwitter?: string;
  contactLinkedin?: string;
  matchReason: string;
  createdAt: string;
  status: "new" | "reviewed" | "converted" | "dismissed";
  requestedBy: string;
}

export interface Match {
  id: string;
  type: "supply-demand" | "resource" | "talent" | "investor" | "cross-project" | "mentor";
  confidence: number;
  sideA: { entity: string; description: string; sourceEmployee: string };
  sideB: { entity: string; description: string; sourceEmployee: string };
  suggestion: string;
  status: "pending" | "accepted" | "dismissed";
  createdAt: string;
}

export interface HeartbeatRun {
  id: string;
  agentId: string;
  agentName: string;
  status: "succeeded" | "failed" | "running";
  startedAt: string;
  completedAt?: string;
  summary?: string;
  tokenUsage: number;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  inputsThisWeek: number;
  projectsOwned: number;
}

export interface DashboardStats {
  totalProjects: number;
  insightsThisWeek: number;
  agentsOnline: number;
  agentsTotal: number;
  matchAccuracy: number;
  sourcingTasksCompleted: number;
  candidatesFound: number;
}
