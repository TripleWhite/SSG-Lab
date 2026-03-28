# SSG Accelerator Dashboard Demo — Phase 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a live, interactive Dashboard demo at `dash.ssgaccelerator.com` with SSG branding, backed by Paperclip API with seeded mock data — ready for stakeholder presentation.

**Architecture:** Next.js 15 App Router on Vercel, calling Paperclip REST API deployed on EC2-B. Paperclip seeded with realistic accelerator data (projects, agents, employees, sourcing results, matches). Dashboard reads the same API in demo and production — zero throwaway work.

**Tech Stack:** Next.js 15, Tailwind CSS v4, TypeScript, Space Grotesk + Outfit fonts, Paperclip REST API, Vercel deployment.

---

## Project Location

- **Local**: `/Users/arthur/Desktop/SSGLAB`
- **GitHub**: `https://github.com/TripleWhite/SSG-Lab`

## File Structure

```
SSGLAB/
├── package.json
├── next.config.ts
├── tailwind.config.ts          # SSG brand tokens
├── tsconfig.json
├── vercel.json                 # Vercel deployment config
├── .env.local                  # PAPERCLIP_API_URL, auth tokens
├── .env.example
│
├── public/
│   └── fonts/                  # Self-hosted Space Grotesk + Outfit (optional, can use Google Fonts)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout: fonts, theme, nav shell
│   │   ├── page.tsx            # / — Overview dashboard
│   │   ├── login/
│   │   │   └── page.tsx        # /login — Auth page
│   │   ├── pipeline/
│   │   │   └── page.tsx        # /pipeline — Kanban board
│   │   ├── agents/
│   │   │   └── page.tsx        # /agents — Agent monitoring
│   │   ├── sourcing/
│   │   │   └── page.tsx        # /sourcing — Sourcing results
│   │   ├── matching/
│   │   │   └── page.tsx        # /matching — Match feed
│   │   ├── analytics/
│   │   │   └── page.tsx        # /analytics — Performance metrics
│   │   ├── resources/
│   │   │   └── page.tsx        # /resources — Resource graph
│   │   └── settings/
│   │       └── page.tsx        # /settings — System config
│   │
│   ├── components/
│   │   ├── nav/
│   │   │   ├── sidebar.tsx     # Left sidebar navigation
│   │   │   └── header.tsx      # Top header bar
│   │   ├── ui/
│   │   │   ├── card.tsx        # Reusable card component
│   │   │   ├── badge.tsx       # Status/tag badges
│   │   │   ├── button.tsx      # Button variants (primary gradient, outline, ghost)
│   │   │   ├── stat-card.tsx   # Metric display card
│   │   │   └── kanban-column.tsx # Pipeline kanban column
│   │   ├── pipeline/
│   │   │   ├── project-card.tsx    # Single project in kanban
│   │   │   └── project-detail.tsx  # Expanded project view (modal/panel)
│   │   ├── agents/
│   │   │   ├── agent-card.tsx      # Single agent status card
│   │   │   └── heartbeat-timeline.tsx # Agent execution timeline
│   │   ├── sourcing/
│   │   │   └── candidate-card.tsx  # Sourcing result card
│   │   ├── matching/
│   │   │   └── match-card.tsx      # Match discovery card
│   │   └── analytics/
│   │       └── metric-chart.tsx    # Simple chart component
│   │
│   ├── lib/
│   │   ├── paperclip.ts        # Paperclip API client
│   │   └── types.ts            # TypeScript types for API responses
│   │
│   └── styles/
│       └── globals.css         # Tailwind base + SSG custom properties
│
└── scripts/
    └── seed-paperclip.ts       # Seed script: creates mock data via Paperclip API
```

---

## Task 1: Project Scaffold + SSG Brand Theme

**Files:**
- Create: `SSGLAB/package.json`
- Create: `SSGLAB/next.config.ts`
- Create: `SSGLAB/tailwind.config.ts`
- Create: `SSGLAB/tsconfig.json`
- Create: `SSGLAB/src/styles/globals.css`
- Create: `SSGLAB/src/app/layout.tsx`
- Create: `SSGLAB/.env.example`
- Create: `SSGLAB/vercel.json`

- [ ] **Step 1: Create project directory**

```bash
mkdir -p /Users/arthur/Desktop/SSGLAB && cd /Users/arthur/Desktop/SSGLAB
```

- [ ] **Step 2: Initialize Next.js project**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --no-turbopack
```

Accept defaults. This creates the scaffold with Next.js 15 + Tailwind + TypeScript.

- [ ] **Step 3: Install additional dependencies**

```bash
npm install lucide-react
```

lucide-react for icons (lightweight, tree-shakeable).

- [ ] **Step 4: Replace `src/styles/globals.css` with SSG brand tokens**

```css
@import "tailwindcss";

:root {
  --ssg-green: #62feca;
  --ssg-yellow: #c8ff75;
  --ssg-blackout: #131818;
  --ssg-stone: #313847;
  --ssg-light: #e2e7ea;

  --background: #0a0f0f;
  --foreground: #f8fafc;
  --card: #111818;
  --card-hover: #1a2222;
  --border: #1e2e2e;
  --muted: #94a3b8;
  --danger: #ef4444;

  --font-heading: "Space Grotesk", system-ui, sans-serif;
  --font-body: "Outfit", system-ui, sans-serif;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-body);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  letter-spacing: -0.03em;
}
```

- [ ] **Step 5: Replace `src/app/layout.tsx` with SSG root layout**

```tsx
import type { Metadata } from "next";
import { Space_Grotesk, Outfit } from "next/font/google";
import "@/styles/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SSG Accelerator Dashboard",
  description: "Agent-powered accelerator management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${outfit.variable}`}>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Create `.env.example`**

```
# Paperclip API
PAPERCLIP_API_URL=http://localhost:3000
PAPERCLIP_API_KEY=your-api-key-here

# Company ID (from Paperclip setup)
PAPERCLIP_COMPANY_ID=your-company-id
```

- [ ] **Step 7: Create `vercel.json`**

```json
{
  "framework": "nextjs"
}
```

- [ ] **Step 8: Run dev server and verify blank page loads**

```bash
npm run dev -- -p 3002
```

Open http://localhost:3002 — should see blank dark page with SSG background color.

- [ ] **Step 9: Commit**

```bash
git init && git add -A && git commit -m "feat: scaffold Next.js project with SSG brand theme"
```

---

## Task 2: UI Component Library (Card, Badge, Button, StatCard)

**Files:**
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/stat-card.tsx`

- [ ] **Step 1: Create Card component**

```tsx
// src/components/ui/card.tsx
import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = "", hover = false }: CardProps) {
  return (
    <div
      className={`
        rounded-lg border border-[var(--border)] bg-[var(--card)] p-6
        ${hover ? "transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#62feca10]" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-lg font-bold tracking-tight ${className}`}>{children}</h3>;
}

export function CardDescription({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-sm text-[var(--muted)]">{children}</p>;
}
```

- [ ] **Step 2: Create Badge component**

```tsx
// src/components/ui/badge.tsx
import { type ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[var(--ssg-green)]/10 text-[var(--ssg-green)]",
  success: "bg-emerald-500/10 text-emerald-400",
  warning: "bg-amber-500/10 text-amber-400",
  danger: "bg-red-500/10 text-red-400",
  info: "bg-sky-500/10 text-sky-400",
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]}`}>
      {children}
    </span>
  );
}
```

- [ ] **Step 3: Create Button component**

```tsx
// src/components/ui/button.tsx
import { type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "outline" | "ghost";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-[var(--ssg-green)] to-[var(--ssg-yellow)] text-[#0f172a] font-semibold hover:scale-105 hover:shadow-[0_0_15px_rgba(100,254,186,0.5)]",
  outline:
    "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--card-hover)]",
  ghost:
    "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

export function Button({ children, variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm transition-all duration-300 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Create StatCard component**

```tsx
// src/components/ui/stat-card.tsx
import { Card } from "./card";
import { type ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: string;
}

export function StatCard({ label, value, icon, trend }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--muted)]">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
          {trend && <p className="mt-1 text-xs text-[var(--ssg-green)]">{trend}</p>}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ssg-green)]/10 text-[var(--ssg-green)]">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: Verify components render**

Update `src/app/page.tsx` temporarily:

```tsx
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";

export default function Home() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-4xl font-bold">SSG Dashboard</h1>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Projects" value={42} trend="+3 this week" />
        <StatCard label="Insights" value={12} />
        <StatCard label="Agents" value="3/3" />
        <StatCard label="Match Rate" value="87%" />
      </div>
      <Card hover>
        <CardTitle>DesignAI</CardTitle>
        <Badge variant="success">On Track</Badge>
        <Badge variant="warning">Follow-up Due</Badge>
      </Card>
      <div className="flex gap-3">
        <Button>Primary Action</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
    </div>
  );
}
```

Run: `npm run dev -- -p 3002`, open http://localhost:3002, verify SSG brand colors, fonts, card hover effect, gradient button.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add UI component library (card, badge, button, stat-card)"
```

---

## Task 3: Navigation Shell (Sidebar + Header)

**Files:**
- Create: `src/components/nav/sidebar.tsx`
- Create: `src/components/nav/header.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create Sidebar component**

```tsx
// src/components/nav/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Kanban,
  Bot,
  Search,
  Link2,
  BarChart3,
  Network,
  Settings,
} from "lucide-react";
import { type ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", label: "Overview", icon: <LayoutDashboard size={18} /> },
  { href: "/pipeline", label: "Pipeline", icon: <Kanban size={18} /> },
  { href: "/agents", label: "Agents", icon: <Bot size={18} /> },
  { href: "/sourcing", label: "Sourcing", icon: <Search size={18} /> },
  { href: "/matching", label: "Matching", icon: <Link2 size={18} /> },
  { href: "/analytics", label: "Analytics", icon: <BarChart3 size={18} />, adminOnly: true },
  { href: "/resources", label: "Resources", icon: <Network size={18} /> },
  { href: "/settings", label: "Settings", icon: <Settings size={18} />, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-[var(--border)] bg-[var(--card)] px-3 py-6">
      <div className="mb-8 px-3">
        <h1 className="bg-gradient-to-r from-[var(--ssg-green)] to-[var(--ssg-yellow)] bg-clip-text text-xl font-bold text-transparent">
          SSG Accelerator
        </h1>
        <p className="mt-0.5 text-xs text-[var(--muted)]">Agent Dashboard</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-[var(--ssg-green)]/10 text-[var(--ssg-green)]"
                  : "text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-[var(--foreground)]"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] pt-4 px-3">
        <p className="text-xs text-[var(--muted)]">Logged in as</p>
        <p className="text-sm font-medium">Arthur</p>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create Header component**

```tsx
// src/components/nav/header.tsx
interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Update layout.tsx to include sidebar**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Space_Grotesk, Outfit } from "next/font/google";
import { Sidebar } from "@/components/nav/sidebar";
import "@/styles/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SSG Accelerator Dashboard",
  description: "Agent-powered accelerator management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${outfit.variable}`}>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        <div className="flex">
          <Sidebar />
          <main className="flex-1 overflow-auto p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify navigation works**

Run: `npm run dev -- -p 3002`, click through sidebar links, verify active state highlighting.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add sidebar navigation and header"
```

---

## Task 4: Paperclip API Client + TypeScript Types

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/paperclip.ts`

- [ ] **Step 1: Define TypeScript types**

```tsx
// src/lib/types.ts

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
```

- [ ] **Step 2: Create Paperclip API client**

```tsx
// src/lib/paperclip.ts
import type {
  Agent,
  Project,
  SourcingResult,
  Match,
  HeartbeatRun,
  Employee,
  DashboardStats,
} from "./types";

const API_URL = process.env.PAPERCLIP_API_URL || "http://localhost:3000";
const API_KEY = process.env.PAPERCLIP_API_KEY || "";
const COMPANY_ID = process.env.PAPERCLIP_COMPANY_ID || "";

async function fetchPaperclip<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 30 },
  });
  if (!res.ok) {
    throw new Error(`Paperclip API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getAgents(): Promise<Agent[]> {
  return fetchPaperclip(`/api/companies/${COMPANY_ID}/agents`);
}

export async function getProjects(): Promise<Project[]> {
  return fetchPaperclip(`/api/companies/${COMPANY_ID}/issues?type=project`);
}

export async function getSourcingResults(): Promise<SourcingResult[]> {
  return fetchPaperclip(`/api/companies/${COMPANY_ID}/issues?type=sourcing`);
}

export async function getMatches(): Promise<Match[]> {
  return fetchPaperclip(`/api/companies/${COMPANY_ID}/issues?type=match`);
}

export async function getHeartbeatRuns(): Promise<HeartbeatRun[]> {
  return fetchPaperclip(`/api/companies/${COMPANY_ID}/dashboard`);
}

export async function getEmployees(): Promise<Employee[]> {
  return fetchPaperclip(`/api/companies/${COMPANY_ID}/agents?role=employee`);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return fetchPaperclip(`/api/companies/${COMPANY_ID}/dashboard`);
}
```

Note: These API paths are approximations of Paperclip's actual API. During Phase 0 with seeded data, we may need to adjust the exact endpoints and response mapping. The key point is the Dashboard fetches from Paperclip's real API — when we replace seed data with live agent output, nothing in the Dashboard changes.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add Paperclip API client and TypeScript types"
```

---

## Task 5: Overview Page (/ — Main Dashboard)

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Build the Overview page**

```tsx
// src/app/page.tsx
import { Header } from "@/components/nav/header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Lightbulb, Bot, Target } from "lucide-react";

// Demo data — will be replaced by Paperclip API calls
const stats = {
  totalProjects: 42,
  insightsThisWeek: 12,
  agentsOnline: "3/3",
  matchAccuracy: "87%",
};

const recentMatches = [
  {
    id: "1",
    sideA: "DesignAI",
    sideB: "BigCorp",
    type: "supply-demand",
    confidence: 92,
    employees: ["Alice", "Bob"],
  },
  {
    id: "2",
    sideA: "NeuralOps",
    sideB: "AWS Program",
    type: "resource",
    confidence: 85,
    employees: ["Carol"],
  },
  {
    id: "3",
    sideA: "FinanceAI",
    sideB: "Sequoia Scout",
    type: "investor",
    confidence: 78,
    employees: ["Alice"],
  },
];

const agentActivity = [
  { time: "09:00", agent: "Portfolio", action: "Daily scan: 38 projects, 5 follow-ups due" },
  { time: "09:15", agent: "Matching", action: "Found 1 new match (DesignAI <> BigCorp)" },
  { time: "10:00", agent: "Sourcing", action: "Completed: AI infra search, 7 candidates" },
  { time: "10:30", agent: "Matching", action: "Scan complete, no new matches" },
  { time: "14:00", agent: "Sourcing", action: "Started: Fintech search (Carol's request)" },
];

const teamActivity = [
  { name: "Alice", inputs: 23, bar: "w-[92%]" },
  { name: "Bob", inputs: 17, bar: "w-[68%]" },
  { name: "Carol", inputs: 11, bar: "w-[44%]" },
  { name: "Dave", inputs: 8, bar: "w-[32%]" },
  { name: "Eve", inputs: 5, bar: "w-[20%]" },
];

const pipelineDist = [
  { stage: "Contact", count: 12, color: "bg-sky-500" },
  { stage: "Diligence", count: 8, color: "bg-[var(--ssg-green)]" },
  { stage: "Decision", count: 3, color: "bg-[var(--ssg-yellow)]" },
  { stage: "Accelerate", count: 15, color: "bg-purple-500" },
  { stage: "Exit", count: 4, color: "bg-orange-500" },
];

export default function OverviewPage() {
  return (
    <>
      <Header title="Overview" description="SSG Accelerator Agent Dashboard" />

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={stats.totalProjects} icon={<Briefcase size={18} />} trend="+3 this week" />
        <StatCard label="Insights This Week" value={stats.insightsThisWeek} icon={<Lightbulb size={18} />} />
        <StatCard label="Agents Online" value={stats.agentsOnline} icon={<Bot size={18} />} />
        <StatCard label="Match Accuracy" value={stats.matchAccuracy} icon={<Target size={18} />} />
      </div>

      {/* Two-column layout */}
      <div className="mt-6 grid grid-cols-2 gap-6">
        {/* Left: Recent Matches + Pipeline */}
        <div className="space-y-6">
          <Card>
            <CardTitle>Recent Matches</CardTitle>
            <div className="mt-4 space-y-3">
              {recentMatches.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-md border border-[var(--border)] p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {m.sideA} <span className="text-[var(--muted)]">&harr;</span> {m.sideB}
                    </p>
                    <p className="text-xs text-[var(--muted)]">{m.employees.join(", ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{m.type}</Badge>
                    <span className="text-sm font-bold text-[var(--ssg-green)]">{m.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Pipeline Distribution</CardTitle>
            <div className="mt-4 space-y-2">
              {pipelineDist.map((p) => (
                <div key={p.stage} className="flex items-center gap-3">
                  <span className="w-24 text-sm text-[var(--muted)]">{p.stage}</span>
                  <div className="flex-1 h-6 rounded bg-[var(--border)]">
                    <div
                      className={`h-6 rounded ${p.color}`}
                      style={{ width: `${(p.count / 42) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-bold">{p.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: Agent Activity + Team */}
        <div className="space-y-6">
          <Card>
            <CardTitle>Agent Activity</CardTitle>
            <div className="mt-4 space-y-2">
              {agentActivity.map((a, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="w-12 text-[var(--muted)]">{a.time}</span>
                  <Badge>{a.agent}</Badge>
                  <span className="text-[var(--muted)]">{a.action}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Team Activity (This Week)</CardTitle>
            <div className="mt-4 space-y-3">
              {teamActivity.map((t) => (
                <div key={t.name} className="flex items-center gap-3">
                  <span className="w-16 text-sm">{t.name}</span>
                  <div className="flex-1 h-3 rounded-full bg-[var(--border)]">
                    <div className={`h-3 rounded-full bg-gradient-to-r from-[var(--ssg-green)] to-[var(--ssg-yellow)] ${t.bar}`} />
                  </div>
                  <span className="w-12 text-right text-sm text-[var(--muted)]">{t.inputs} inputs</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify the Overview page renders correctly**

Run: `npm run dev -- -p 3002`, open http://localhost:3002. Verify: stats row, recent matches, pipeline distribution, agent activity timeline, team activity bars — all in SSG brand colors.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add Overview dashboard page with demo data"
```

---

## Task 6: Pipeline Kanban Page

**Files:**
- Create: `src/components/pipeline/project-card.tsx`
- Create: `src/components/ui/kanban-column.tsx`
- Create: `src/app/pipeline/page.tsx`

- [ ] **Step 1: Create KanbanColumn component**

```tsx
// src/components/ui/kanban-column.tsx
import { type ReactNode } from "react";

interface KanbanColumnProps {
  title: string;
  count: number;
  children: ReactNode;
}

export function KanbanColumn({ title, count, children }: KanbanColumnProps) {
  return (
    <div className="flex flex-col min-w-[240px]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--border)] text-xs">
          {count}
        </span>
      </div>
      <div className="flex-1 space-y-3">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create ProjectCard component**

```tsx
// src/components/pipeline/project-card.tsx
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProjectCardProps {
  companyName: string;
  founderName: string;
  assignee: string;
  daysInStage: number;
  health: "on-track" | "needs-attention" | "at-risk" | "overdue";
  tags: string[];
}

const healthVariant = {
  "on-track": "success" as const,
  "needs-attention": "warning" as const,
  "at-risk": "danger" as const,
  overdue: "danger" as const,
};

export function ProjectCard({
  companyName,
  founderName,
  assignee,
  daysInStage,
  health,
  tags,
}: ProjectCardProps) {
  return (
    <Card hover className="cursor-pointer p-4">
      <p className="font-semibold text-sm">{companyName}</p>
      <p className="text-xs text-[var(--muted)]">{founderName}</p>
      <div className="mt-2 flex items-center gap-2">
        <Badge variant={healthVariant[health]}>{health}</Badge>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)]">
        <span>{assignee}</span>
        <span>{daysInStage}d</span>
      </div>
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((t) => (
            <span key={t} className="rounded bg-[var(--border)] px-1.5 py-0.5 text-[10px]">{t}</span>
          ))}
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 3: Create Pipeline page with demo data**

```tsx
// src/app/pipeline/page.tsx
import { Header } from "@/components/nav/header";
import { KanbanColumn } from "@/components/ui/kanban-column";
import { ProjectCard } from "@/components/pipeline/project-card";

const columns = [
  {
    title: "Initial Contact",
    projects: [
      { companyName: "AI Design Co", founderName: "Zhang Wei", assignee: "Alice", daysInStage: 3, health: "on-track" as const, tags: ["AI", "Design"] },
      { companyName: "RoboArm", founderName: "Li Ming", assignee: "Bob", daysInStage: 21, health: "overdue" as const, tags: ["Robotics"] },
      { companyName: "DataFlow", founderName: "Wang Fei", assignee: "Carol", daysInStage: 1, health: "on-track" as const, tags: ["Data", "Infra"] },
    ],
  },
  {
    title: "Due Diligence",
    projects: [
      { companyName: "DesignAI", founderName: "Chen Hao", assignee: "Alice", daysInStage: 14, health: "on-track" as const, tags: ["AI", "SaaS"] },
      { companyName: "FinBot", founderName: "Liu Wei", assignee: "Dave", daysInStage: 30, health: "needs-attention" as const, tags: ["Fintech"] },
    ],
  },
  {
    title: "Investment Decision",
    projects: [
      { companyName: "FinanceAI", founderName: "Zhou Jing", assignee: "Carol", daysInStage: 7, health: "on-track" as const, tags: ["Fintech", "AI"] },
    ],
  },
  {
    title: "Acceleration",
    projects: [
      { companyName: "HealthBot", founderName: "Xu Ming", assignee: "Alice", daysInStage: 45, health: "on-track" as const, tags: ["Health", "AI"] },
      { companyName: "EduTech", founderName: "Ma Yun", assignee: "Bob", daysInStage: 60, health: "on-track" as const, tags: ["Education"] },
      { companyName: "LogiAI", founderName: "Zhao Lei", assignee: "Eve", daysInStage: 30, health: "needs-attention" as const, tags: ["Logistics"] },
    ],
  },
  {
    title: "Exit",
    projects: [
      { companyName: "CloudSec", founderName: "Huang Tao", assignee: "Carol", daysInStage: 180, health: "on-track" as const, tags: ["Security", "Cloud"] },
    ],
  },
];

export default function PipelinePage() {
  return (
    <>
      <Header title="Pipeline" description="Project pipeline across all stages" />
      <div className="flex gap-6 overflow-x-auto pb-4">
        {columns.map((col) => (
          <KanbanColumn key={col.title} title={col.title} count={col.projects.length}>
            {col.projects.map((p) => (
              <ProjectCard key={p.companyName} {...p} />
            ))}
          </KanbanColumn>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 4: Verify Pipeline page**

Open http://localhost:3002/pipeline. Verify: 5 columns, cards with company names, health badges, assignees.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add Pipeline kanban page"
```

---

## Task 7: Agents Monitoring Page

**Files:**
- Create: `src/components/agents/agent-card.tsx`
- Create: `src/components/agents/heartbeat-timeline.tsx`
- Create: `src/app/agents/page.tsx`

- [ ] **Step 1: Create AgentCard component**

```tsx
// src/components/agents/agent-card.tsx
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AgentCardProps {
  name: string;
  status: "running" | "idle" | "error";
  lastHeartbeat: string;
  nextHeartbeat: string;
  todayRuns: number;
  tokenUsage: string;
  recentActions: string[];
}

export function AgentCard({
  name,
  status,
  lastHeartbeat,
  nextHeartbeat,
  todayRuns,
  tokenUsage,
  recentActions,
}: AgentCardProps) {
  const statusVariant = status === "running" ? "success" : status === "idle" ? "info" : "danger";

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>{name}</CardTitle>
        <Badge variant={statusVariant}>{status}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-[var(--muted)]">Last heartbeat</p>
          <p className="font-medium">{lastHeartbeat}</p>
        </div>
        <div>
          <p className="text-[var(--muted)]">Next</p>
          <p className="font-medium">{nextHeartbeat}</p>
        </div>
        <div>
          <p className="text-[var(--muted)]">Today</p>
          <p className="font-medium">{todayRuns} runs / {tokenUsage}</p>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        {recentActions.map((a, i) => (
          <p key={i} className="text-xs text-[var(--muted)]">{a}</p>
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Create HeartbeatTimeline component**

```tsx
// src/components/agents/heartbeat-timeline.tsx
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";

interface TimelineEntry {
  time: string;
  agent: string;
  status: "succeeded" | "failed" | "running";
  summary: string;
  tokens: number;
}

interface HeartbeatTimelineProps {
  entries: TimelineEntry[];
}

export function HeartbeatTimeline({ entries }: HeartbeatTimelineProps) {
  return (
    <Card>
      <CardTitle>Heartbeat Timeline (Today)</CardTitle>
      <div className="mt-4 space-y-3">
        {entries.map((e, i) => (
          <div key={i} className="flex items-start gap-3 text-sm">
            <span className="w-14 text-[var(--muted)]">{e.time}</span>
            <div className="mt-1 h-2 w-2 rounded-full bg-[var(--ssg-green)]" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{e.agent}</span>
                <Badge variant={e.status === "succeeded" ? "success" : e.status === "failed" ? "danger" : "info"}>
                  {e.status}
                </Badge>
                <span className="text-xs text-[var(--muted)]">{e.tokens.toLocaleString()} tokens</span>
              </div>
              <p className="text-xs text-[var(--muted)]">{e.summary}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Create Agents page**

```tsx
// src/app/agents/page.tsx
import { Header } from "@/components/nav/header";
import { AgentCard } from "@/components/agents/agent-card";
import { HeartbeatTimeline } from "@/components/agents/heartbeat-timeline";

const agents = [
  {
    name: "Sourcing Agent",
    status: "running" as const,
    lastHeartbeat: "10:00",
    nextHeartbeat: "14:00",
    todayRuns: 3,
    tokenUsage: "45k",
    recentActions: [
      "10:00 — Completed AI infra search: 7 candidates",
      "06:00 — Periodic scan: 2 new discoveries",
      "Yesterday 22:00 — Manual trigger (Alice): Fintech search",
    ],
  },
  {
    name: "Portfolio Agent",
    status: "idle" as const,
    lastHeartbeat: "09:00",
    nextHeartbeat: "Tomorrow 09:00",
    todayRuns: 1,
    tokenUsage: "28k",
    recentActions: [
      "09:00 — Scanned 38 projects: 5 follow-ups due, 3 action plans generated",
    ],
  },
  {
    name: "Matching Agent",
    status: "running" as const,
    lastHeartbeat: "10:30",
    nextHeartbeat: "11:00",
    todayRuns: 12,
    tokenUsage: "15k",
    recentActions: [
      "10:30 — Scan complete: no new matches",
      "10:00 — Found match: DesignAI <> BigCorp (92%)",
      "09:30 — Scan complete: no new matches",
    ],
  },
];

const timeline = [
  { time: "06:00", agent: "Sourcing", status: "succeeded" as const, summary: "Periodic scan: 2 discoveries in AI vertical", tokens: 12400 },
  { time: "09:00", agent: "Portfolio", status: "succeeded" as const, summary: "Daily scan: 38 projects, 5 follow-ups, 3 action plans", tokens: 28100 },
  { time: "09:15", agent: "Matching", status: "succeeded" as const, summary: "No new matches", tokens: 1200 },
  { time: "09:30", agent: "Matching", status: "succeeded" as const, summary: "No new matches", tokens: 1100 },
  { time: "10:00", agent: "Matching", status: "succeeded" as const, summary: "Found match: DesignAI <> BigCorp (92%)", tokens: 3400 },
  { time: "10:00", agent: "Sourcing", status: "succeeded" as const, summary: "AI infra search complete: 7 candidates", tokens: 31200 },
  { time: "10:30", agent: "Matching", status: "succeeded" as const, summary: "No new matches", tokens: 1150 },
];

export default function AgentsPage() {
  return (
    <>
      <Header title="Agents" description="Monitor agent status and heartbeat history" />
      <div className="space-y-4">
        {agents.map((a) => (
          <AgentCard key={a.name} {...a} />
        ))}
      </div>
      <div className="mt-6">
        <HeartbeatTimeline entries={timeline} />
      </div>
    </>
  );
}
```

- [ ] **Step 4: Verify, commit**

Open http://localhost:3002/agents. Verify 3 agent cards + timeline.

```bash
git add -A && git commit -m "feat: add Agents monitoring page"
```

---

## Task 8: Sourcing Results Page

**Files:**
- Create: `src/components/sourcing/candidate-card.tsx`
- Create: `src/app/sourcing/page.tsx`

- [ ] **Step 1: Create CandidateCard**

```tsx
// src/components/sourcing/candidate-card.tsx
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CandidateCardProps {
  founderName: string;
  companyName: string;
  domain: string;
  stage: string;
  relevanceScore: number;
  sources: string[];
  contactEmail?: string;
  contactTwitter?: string;
  matchReason: string;
  requestedBy: string;
  status: "new" | "reviewed" | "converted" | "dismissed";
}

export function CandidateCard({
  founderName,
  companyName,
  domain,
  stage,
  relevanceScore,
  sources,
  contactEmail,
  contactTwitter,
  matchReason,
  requestedBy,
  status,
}: CandidateCardProps) {
  return (
    <Card hover>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">{founderName}</p>
          <p className="text-sm text-[var(--muted)]">{companyName} &middot; {domain} &middot; {stage}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[var(--ssg-green)]">{relevanceScore}%</div>
          <Badge variant={status === "new" ? "info" : status === "converted" ? "success" : "default"}>{status}</Badge>
        </div>
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">{matchReason}</p>
      <div className="mt-3 flex items-center gap-4 text-xs text-[var(--muted)]">
        <span>Sources: {sources.join(", ")}</span>
        {contactEmail && <span>{contactEmail}</span>}
        {contactTwitter && <span>{contactTwitter}</span>}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-[var(--muted)]">Requested by {requestedBy}</span>
        <div className="flex gap-2">
          <Button variant="outline" className="text-xs px-3 py-1">Create Project</Button>
          <Button variant="ghost" className="text-xs px-3 py-1">Dismiss</Button>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Create Sourcing page with demo data**

```tsx
// src/app/sourcing/page.tsx
import { Header } from "@/components/nav/header";
import { CandidateCard } from "@/components/sourcing/candidate-card";

const candidates = [
  {
    founderName: "John Chen",
    companyName: "NeuralOps",
    domain: "AI Infrastructure",
    stage: "Seed",
    relevanceScore: 85,
    sources: ["GitHub", "Twitter"],
    contactEmail: "john@neuralops.ai",
    contactTwitter: "@johnchen_ai",
    matchReason: "Building LLM serving platform. 2.3k GitHub stars, active OSS contributor. Matches Carol's AI infra insight.",
    requestedBy: "Carol",
    status: "new" as const,
  },
  {
    founderName: "Sarah Liu",
    companyName: "InfraAI",
    domain: "AI Infrastructure",
    stage: "Pre-seed",
    relevanceScore: 78,
    sources: ["LinkedIn", "Xiaohongshu"],
    contactEmail: "sarah@infraai.com",
    matchReason: "Ex-NVIDIA team, building inference optimization toolkit. Active on Xiaohongshu sharing AI infra content.",
    requestedBy: "Carol",
    status: "new" as const,
  },
  {
    founderName: "Wei Zhang",
    companyName: "DesignAI",
    domain: "AI Design Tools",
    stage: "Seed",
    relevanceScore: 92,
    sources: ["GitHub", "Twitter", "LinkedIn"],
    contactEmail: "wei@designai.co",
    contactTwitter: "@weizhang",
    matchReason: "AI-powered design tool with 500 MAU. Ex-Figma engineer. Strong product-market fit signals.",
    requestedBy: "Alice",
    status: "converted" as const,
  },
];

export default function SourcingPage() {
  return (
    <>
      <Header title="Sourcing Results" description="Founder and team candidates from automated sourcing" />
      <div className="mb-4 flex gap-2">
        {["All", "AI Infra", "Fintech", "Design", "Health"].map((f) => (
          <button
            key={f}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              f === "All"
                ? "bg-[var(--ssg-green)]/10 text-[var(--ssg-green)]"
                : "text-[var(--muted)] hover:bg-[var(--card-hover)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {candidates.map((c) => (
          <CandidateCard key={c.companyName} {...c} />
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify, commit**

```bash
git add -A && git commit -m "feat: add Sourcing results page"
```

---

## Task 9: Matching Feed Page

**Files:**
- Create: `src/components/matching/match-card.tsx`
- Create: `src/app/matching/page.tsx`

- [ ] **Step 1: Create MatchCard**

```tsx
// src/components/matching/match-card.tsx
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MatchCardProps {
  type: string;
  confidence: number;
  sideA: { entity: string; description: string; employee: string };
  sideB: { entity: string; description: string; employee: string };
  suggestion: string;
  status: "pending" | "accepted" | "dismissed";
  createdAt: string;
}

export function MatchCard({ type, confidence, sideA, sideB, suggestion, status, createdAt }: MatchCardProps) {
  return (
    <Card hover>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge>{type}</Badge>
          <span className="text-sm font-bold text-[var(--ssg-green)]">{confidence}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status === "accepted" ? "success" : status === "dismissed" ? "danger" : "info"}>{status}</Badge>
          <span className="text-xs text-[var(--muted)]">{createdAt}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-4">
        <div className="rounded-md border border-[var(--border)] p-3">
          <p className="text-sm font-medium">{sideA.entity}</p>
          <p className="text-xs text-[var(--muted)]">{sideA.description}</p>
          <p className="mt-1 text-xs text-[var(--ssg-green)]">via {sideA.employee}</p>
        </div>
        <div className="rounded-md border border-[var(--border)] p-3">
          <p className="text-sm font-medium">{sideB.entity}</p>
          <p className="text-xs text-[var(--muted)]">{sideB.description}</p>
          <p className="mt-1 text-xs text-[var(--ssg-green)]">via {sideB.employee}</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-[var(--muted)]">{suggestion}</p>

      {status === "pending" && (
        <div className="mt-3 flex gap-2">
          <Button variant="outline" className="text-xs px-3 py-1">Create Task</Button>
          <Button variant="ghost" className="text-xs px-3 py-1">Dismiss</Button>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Create Matching page with demo data covering all 6 match types**

```tsx
// src/app/matching/page.tsx
import { Header } from "@/components/nav/header";
import { MatchCard } from "@/components/matching/match-card";

const matches = [
  {
    type: "supply-demand",
    confidence: 92,
    sideA: { entity: "DesignAI", description: "Needs enterprise customers for AI design tool", employee: "Alice" },
    sideB: { entity: "BigCorp", description: "Evaluating AI design solutions for design team", employee: "Bob" },
    suggestion: "Introduce DesignAI founder Zhang Wei to BigCorp design lead",
    status: "pending" as const,
    createdAt: "2h ago",
  },
  {
    type: "resource",
    confidence: 88,
    sideA: { entity: "NeuralOps", description: "Needs cloud credits for GPU training", employee: "Carol" },
    sideB: { entity: "AWS Program", description: "AWS Activate credits available", employee: "Alice" },
    suggestion: "Alice has AWS connection — help NeuralOps apply for AWS Activate",
    status: "accepted" as const,
    createdAt: "1d ago",
  },
  {
    type: "investor",
    confidence: 78,
    sideA: { entity: "FinanceAI", description: "Raising seed round, $2M target", employee: "Carol" },
    sideB: { entity: "Sequoia Scout", description: "Interested in AI+fintech, seed stage", employee: "Alice" },
    suggestion: "Introduce FinanceAI to Sequoia scout for potential co-investment",
    status: "pending" as const,
    createdAt: "3h ago",
  },
  {
    type: "talent",
    confidence: 72,
    sideA: { entity: "RoboArm", description: "Looking for CTO with robotics + ML background", employee: "Bob" },
    sideB: { entity: "Dr. Li (Talent Pool)", description: "Ex-Boston Dynamics, seeking startup opportunity", employee: "Dave" },
    suggestion: "Connect RoboArm founder with Dr. Li for CTO conversation",
    status: "pending" as const,
    createdAt: "5h ago",
  },
  {
    type: "cross-project",
    confidence: 75,
    sideA: { entity: "HealthBot", description: "Has hospital partnerships for clinical data", employee: "Alice" },
    sideB: { entity: "DataFlow", description: "Building medical data pipeline, needs clinical data sources", employee: "Carol" },
    suggestion: "HealthBot's hospital network could provide DataFlow with clinical data access",
    status: "dismissed" as const,
    createdAt: "2d ago",
  },
  {
    type: "mentor",
    confidence: 82,
    sideA: { entity: "EduTech", description: "Struggling with B2B sales strategy", employee: "Bob" },
    sideB: { entity: "Mentor: James Wang", description: "Expert in B2B SaaS sales, 15 years experience", employee: "Eve" },
    suggestion: "Connect EduTech founder with mentor James Wang for B2B sales coaching",
    status: "accepted" as const,
    createdAt: "3d ago",
  },
];

export default function MatchingPage() {
  return (
    <>
      <Header title="Matching" description="Cross-employee, cross-project, and resource match discoveries" />
      <div className="space-y-4">
        {matches.map((m, i) => (
          <MatchCard key={i} {...m} />
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify, commit**

```bash
git add -A && git commit -m "feat: add Matching feed page with 6 match types"
```

---

## Task 10: Analytics + Resources + Settings Pages (Stub)

**Files:**
- Create: `src/app/analytics/page.tsx`
- Create: `src/app/resources/page.tsx`
- Create: `src/app/settings/page.tsx`

- [ ] **Step 1: Create Analytics page**

```tsx
// src/app/analytics/page.tsx
import { Header } from "@/components/nav/header";
import { Card, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";

const weeklyData = [
  { week: "W1", sourcing: 65, matching: 45 },
  { week: "W2", sourcing: 72, matching: 52 },
  { week: "W3", sourcing: 68, matching: 58 },
  { week: "W4", sourcing: 75, matching: 55 },
];

export default function AnalyticsPage() {
  return (
    <>
      <Header title="Analytics" description="System performance and benchmarks" />
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Sourcing Hit Rate" value="32%" trend="+5% vs last month" />
        <StatCard label="Match Precision" value="54%" trend="+8% vs last month" />
        <StatCard label="Follow-up Compliance" value="91%" trend="+2% vs last week" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-6">
        <Card>
          <CardTitle>Sourcing Hit Rate (Weekly)</CardTitle>
          <div className="mt-4 flex items-end gap-3 h-40">
            {weeklyData.map((d) => (
              <div key={d.week} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t bg-gradient-to-t from-[var(--ssg-green)] to-[var(--ssg-yellow)]" style={{ height: `${d.sourcing * 1.5}px` }} />
                <span className="text-xs text-[var(--muted)]">{d.week}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>Match Precision (Weekly)</CardTitle>
          <div className="mt-4 flex items-end gap-3 h-40">
            {weeklyData.map((d) => (
              <div key={d.week} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t bg-gradient-to-t from-[var(--ssg-green)] to-[var(--ssg-yellow)]" style={{ height: `${d.matching * 1.5}px` }} />
                <span className="text-xs text-[var(--muted)]">{d.week}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="mt-6">
        <Card>
          <CardTitle>Agent Cost Breakdown (Daily Average)</CardTitle>
          <div className="mt-4 space-y-3">
            {[
              { agent: "Sourcing", cost: "$8.50", tokens: "142k" },
              { agent: "Portfolio", cost: "$1.80", tokens: "28k" },
              { agent: "Matching", cost: "$1.20", tokens: "18k" },
              { agent: "Feishu Bot", cost: "$1.50", tokens: "24k" },
            ].map((a) => (
              <div key={a.agent} className="flex items-center justify-between text-sm">
                <span>{a.agent}</span>
                <div className="flex gap-6">
                  <span className="text-[var(--muted)]">{a.tokens} tokens</span>
                  <span className="font-medium">{a.cost}/day</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create Resources page**

```tsx
// src/app/resources/page.tsx
import { Header } from "@/components/nav/header";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const resources = [
  { category: "Employee Connections", items: [
    { name: "Alice", connections: ["AWS", "Sequoia", "Google Cloud"], count: 3 },
    { name: "Bob", connections: ["YC Alumni Network", "Hiring Pool"], count: 2 },
    { name: "Carol", connections: ["Tencent", "Alibaba Cloud", "Matrix Partners"], count: 3 },
  ]},
  { category: "LP / Investor Network", items: [
    { name: "Sequoia Scout", connections: ["AI", "Fintech", "Seed-Series A"], count: 3 },
    { name: "Matrix Partners", connections: ["Enterprise SaaS", "Series A-B"], count: 2 },
    { name: "Angel: Dr. Chen", connections: ["Healthcare AI", "Pre-seed"], count: 2 },
  ]},
  { category: "Partner Programs", items: [
    { name: "AWS Activate", connections: ["Cloud credits up to $100k"], count: 1 },
    { name: "Google for Startups", connections: ["Cloud credits", "GDG access"], count: 2 },
    { name: "Legal: ZhangLaw", connections: ["Incorporation", "IP filing"], count: 2 },
  ]},
  { category: "Mentors", items: [
    { name: "James Wang", connections: ["B2B Sales", "SaaS GTM"], count: 2 },
    { name: "Dr. Li Ming", connections: ["AI/ML", "Robotics"], count: 2 },
    { name: "Sarah Zhou", connections: ["Product Strategy", "UX"], count: 2 },
  ]},
];

export default function ResourcesPage() {
  return (
    <>
      <Header title="Resources" description="Accelerator resource graph — connections, LPs, mentors, partners" />
      <div className="grid grid-cols-2 gap-6">
        {resources.map((group) => (
          <Card key={group.category}>
            <CardTitle>{group.category}</CardTitle>
            <div className="mt-4 space-y-3">
              {group.items.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <div className="flex gap-1 mt-1">
                      {item.connections.map((c) => (
                        <Badge key={c}>{c}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Create Settings page (placeholder)**

```tsx
// src/app/settings/page.tsx
import { Header } from "@/components/nav/header";
import { Card, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <>
      <Header title="Settings" description="System configuration (Board only)" />
      <div className="space-y-4">
        <Card>
          <CardTitle>Agent Configuration</CardTitle>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Manage SOUL.md, HEARTBEAT.md, and tool configurations for each agent.
            Configuration management will be available after Phase 1 deployment.
          </p>
        </Card>
        <Card>
          <CardTitle>Heartbeat Schedule</CardTitle>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Configure heartbeat frequency and event triggers for each agent.
          </p>
        </Card>
        <Card>
          <CardTitle>Budget & Limits</CardTitle>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Set monthly token budgets and cost limits per agent.
          </p>
        </Card>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Verify all pages, commit**

Navigate to /analytics, /resources, /settings. All should render with demo data.

```bash
git add -A && git commit -m "feat: add Analytics, Resources, and Settings pages"
```

---

## Task 11: Login Page + Responsive Polish

**Files:**
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: Create Login page**

```tsx
// src/app/login/page.tsx
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="bg-gradient-to-r from-[var(--ssg-green)] to-[var(--ssg-yellow)] bg-clip-text text-4xl font-bold text-transparent">
            SSG Accelerator
          </h1>
          <p className="mt-2 text-[var(--muted)]">Agent Dashboard</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8">
          <p className="mb-6 text-sm text-[var(--muted)]">Sign in to access your dashboard</p>
          <Button className="w-full">Sign in with Feishu</Button>
          <p className="mt-4 text-xs text-[var(--muted)]">
            Requires SSG Accelerator Feishu account
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Exclude login from sidebar layout**

Update `src/app/layout.tsx` — the login page should not show the sidebar. Use a conditional or route group:

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Space_Grotesk, Outfit } from "next/font/google";
import "@/styles/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SSG Accelerator Dashboard",
  description: "Agent-powered accelerator management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${outfit.variable}`}>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        {children}
      </body>
    </html>
  );
}
```

Then create a route group for dashboard pages. Move sidebar into `src/app/(dashboard)/layout.tsx`:

```tsx
// src/app/(dashboard)/layout.tsx
import { Sidebar } from "@/components/nav/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
```

Move all dashboard pages into `src/app/(dashboard)/`:
- `src/app/(dashboard)/page.tsx` (overview)
- `src/app/(dashboard)/pipeline/page.tsx`
- `src/app/(dashboard)/agents/page.tsx`
- `src/app/(dashboard)/sourcing/page.tsx`
- `src/app/(dashboard)/matching/page.tsx`
- `src/app/(dashboard)/analytics/page.tsx`
- `src/app/(dashboard)/resources/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`

Keep `src/app/login/page.tsx` outside the route group (no sidebar).

- [ ] **Step 3: Verify login page has no sidebar, dashboard pages have sidebar**

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add login page and route group layout"
```

---

## Task 12: Deploy to Vercel

- [ ] **Step 1: Push to GitHub**

```bash
cd /Users/arthur/Desktop/SSGLAB
gh repo create ssg-dashboard --private --source=. --push
```

- [ ] **Step 2: Deploy to Vercel**

```bash
npx vercel --prod
```

Follow prompts. Set environment variables in Vercel dashboard:
- `PAPERCLIP_API_URL` — point to EC2-B when ready, or leave empty for demo data
- `PAPERCLIP_API_KEY` — set when Paperclip is deployed
- `PAPERCLIP_COMPANY_ID` — set when Paperclip is deployed

- [ ] **Step 3: Configure custom domain**

In Vercel dashboard: Settings > Domains > add `dash.ssgaccelerator.com`. Update DNS at your domain registrar.

- [ ] **Step 4: Verify live deployment**

Open `dash.ssgaccelerator.com` (or Vercel preview URL). All pages should render with demo data.

- [ ] **Step 5: Commit any config changes**

```bash
git add -A && git commit -m "chore: add Vercel deployment config"
```

---

## Phase 0 Completion Checklist

After all 12 tasks:

- [ ] All 10 dashboard pages render with SSG brand
- [ ] Sidebar navigation works across all pages
- [ ] Pipeline kanban shows 5 stages with project cards
- [ ] Agent monitoring shows 3 agents with heartbeat timeline
- [ ] Sourcing page shows filterable candidate results
- [ ] Matching page shows all 6 match types
- [ ] Analytics page shows metrics and charts
- [ ] Resources page shows accelerator resource graph
- [ ] Login page renders without sidebar
- [ ] Deployed to Vercel at `dash.ssgaccelerator.com`
- [ ] Brand: mint green #62feca + lime #c8ff75, Space Grotesk headings, dark theme

---

## Next Plans

After Phase 0 ships, create separate implementation plans for:

1. **Phase 1: Data Pipeline** — EC2-B setup, OpenClaw deployment, Feishu channel, memory-mimir redesign
2. **Phase 2: Sourcing Agent** — SOUL/HEARTBEAT, browser subagents, Paperclip heartbeat, Chinese platforms
3. **Phase 3: Matching Agent** — 6-type matching, resource graph, group chat notifications
4. **Phase 4: Portfolio Agent** — daily scan, reminders, action plans, resource suggestions
5. **Phase 5: Dashboard Integration** — replace demo data with live Paperclip + Mimir APIs
