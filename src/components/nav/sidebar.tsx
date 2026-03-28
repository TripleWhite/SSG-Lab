"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Kanban, Bot, Search, Link2, BarChart3, Network, Settings } from "lucide-react";
import { type ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { href: "/", label: "Overview", icon: <LayoutDashboard size={18} /> },
  { href: "/pipeline", label: "Pipeline", icon: <Kanban size={18} /> },
  { href: "/agents", label: "Agents", icon: <Bot size={18} /> },
  { href: "/sourcing", label: "Sourcing", icon: <Search size={18} /> },
  { href: "/matching", label: "Matching", icon: <Link2 size={18} /> },
  { href: "/analytics", label: "Analytics", icon: <BarChart3 size={18} /> },
  { href: "/resources", label: "Resources", icon: <Network size={18} /> },
  { href: "/settings", label: "Settings", icon: <Settings size={18} /> },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-[var(--border)] bg-[var(--card)] px-3 py-6">
      <div className="mb-8 px-3">
        <h1 className="bg-gradient-to-r from-[var(--ssg-green)] to-[var(--ssg-yellow)] bg-clip-text text-xl font-bold text-transparent">
          SSG Accelerator
        </h1>
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">Agent Dashboard</p>
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
                  : "text-[var(--muted-foreground)] hover:bg-[var(--card-hover)] hover:text-[var(--foreground)]"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] pt-4 px-3">
        <p className="text-xs text-[var(--muted-foreground)]">Logged in as</p>
        <p className="text-sm font-medium">Arthur</p>
      </div>
    </aside>
  );
}
