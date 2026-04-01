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
import { BrandLockup } from "@/components/nav/brand-lockup";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  boardOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", label: "Overview", icon: <LayoutDashboard size={18} /> },
  { href: "/pipeline", label: "Pipeline", icon: <Kanban size={18} /> },
  { href: "/agents", label: "Team", icon: <Bot size={18} /> },
  { href: "/sourcing", label: "Sourcing", icon: <Search size={18} /> },
  { href: "/matching", label: "Matching", icon: <Link2 size={18} /> },
  { href: "/analytics", label: "Activity", icon: <BarChart3 size={18} />, boardOnly: true },
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
    <aside className="border-b border-[var(--border)] bg-[linear-gradient(180deg,rgba(17,20,22,0.96),rgba(10,12,15,0.98))] px-3 py-4 backdrop-blur md:flex md:h-screen md:w-64 md:flex-col md:border-b-0 md:border-r md:px-4 md:py-6">
      <div className="px-2 md:mb-8 md:px-3">
        <BrandLockup compact />
        <p className="mt-3 text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
          Accelerator OS
        </p>
      </div>

      <nav className="-mx-1 mt-4 flex gap-1 overflow-x-auto px-1 pb-2 md:mx-0 md:mt-0 md:flex-1 md:flex-col md:gap-1 md:overflow-visible md:px-0 md:pb-0">
        {visibleItems.map((item, idx) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`animate-fade-in flex flex-none items-center gap-3 border-l px-3 py-2.5 text-sm transition-colors md:w-full ${
                isActive
                  ? "border-[var(--ssg-green)] bg-[var(--ssg-green)]/10 text-[var(--ssg-green)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:bg-[var(--card-hover)] hover:text-[var(--foreground)]"
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
          <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
            Signed in
          </p>
          <p className="mt-1 text-sm font-medium">{userName}</p>
          <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-[var(--ssg-green)]/70">
            {role === "board" ? "Board Access" : "Team Access"}
          </p>
        </div>
        <form action="/api/auth/logout" method="post" className="md:mt-3">
          <button
            type="submit"
            className="inline-flex text-xs uppercase tracking-[0.16em] text-[var(--ssg-green)] transition-colors hover:text-[var(--ssg-yellow)]"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
