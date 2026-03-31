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
  boardOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", label: "Overview", icon: <LayoutDashboard size={18} /> },
  { href: "/pipeline", label: "Pipeline", icon: <Kanban size={18} /> },
  { href: "/agents", label: "Agents", icon: <Bot size={18} /> },
  { href: "/sourcing", label: "Sourcing", icon: <Search size={18} /> },
  { href: "/matching", label: "Matching", icon: <Link2 size={18} /> },
  { href: "/analytics", label: "Analytics", icon: <BarChart3 size={18} />, boardOnly: true },
  { href: "/resources", label: "Resources", icon: <Network size={18} /> },
  { href: "/settings", label: "Settings", icon: <Settings size={18} />, boardOnly: true },
];

interface SidebarProps {
  userName: string;
  role: "board" | "employee";
}

export function Sidebar({ userName, role }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => !item.boardOnly || role === "board");

  return (
    <aside className="border-b border-[var(--border)] bg-[var(--card)]/95 px-3 py-4 backdrop-blur md:flex md:h-screen md:w-56 md:flex-col md:border-b-0 md:border-r md:px-3 md:py-6">
      <div className="px-2 md:mb-8 md:px-3">
        <h1 className="text-glow bg-gradient-to-r from-[var(--ssg-green)] to-[var(--ssg-yellow)] bg-clip-text text-xl font-bold text-transparent">
          SSG Accelerator
        </h1>
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
          Agent Dashboard
        </p>
      </div>

      <nav className="-mx-1 mt-4 flex gap-1 overflow-x-auto px-1 pb-2 md:mx-0 md:mt-0 md:flex-1 md:flex-col md:gap-1 md:overflow-visible md:px-0 md:pb-0">
        {visibleItems.map((item, idx) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`animate-fade-in flex flex-none items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors md:w-full ${
                isActive
                  ? "bg-[var(--ssg-green)]/10 text-[var(--ssg-green)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--card-hover)] hover:text-[var(--foreground)]"
              }`}
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-3 flex items-end justify-between gap-3 border-t border-[var(--border)] px-2 pt-3 md:mt-auto md:block md:px-3 md:pt-4">
        <div>
          <p className="text-xs text-[var(--muted-foreground)]">Logged in as</p>
          <p className="text-sm font-medium">{userName}</p>
          <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            {role}
          </p>
        </div>
        <form action="/api/auth/logout" method="post" className="md:mt-3">
          <button
            type="submit"
            className="inline-flex text-xs text-[var(--ssg-green)] transition-colors hover:text-[var(--ssg-yellow)]"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
