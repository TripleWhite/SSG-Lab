import { type ReactNode } from "react";

interface SectionBadgeProps {
  children: ReactNode;
  className?: string;
}

export function SectionBadge({
  children,
  className = "",
}: SectionBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 border border-[var(--ssg-green)]/20 bg-[linear-gradient(135deg,rgba(100,254,186,0.08),rgba(214,255,115,0.04))] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-[var(--foreground)]/84 ${className}`}
    >
      <span className="h-2 w-2 shrink-0 bg-[var(--ssg-green)] shadow-[0_0_10px_rgba(100,254,186,0.65)]" />
      {children}
    </span>
  );
}
