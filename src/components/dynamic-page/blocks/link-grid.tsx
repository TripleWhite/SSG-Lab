import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { LinkGridItem } from "../types";

export function LinkGridBlock({ items }: { items: LinkGridItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, i) => (
        <Link
          key={i}
          href={item.href}
          className="group border border-[var(--border)] bg-[var(--card)] p-4 transition-all hover:border-[var(--ssg-green)]/30 hover:-translate-y-0.5"
        >
          <div className="flex items-start justify-between">
            <p className="text-sm font-semibold group-hover:text-[var(--ssg-green)]">
              {item.label}
            </p>
            <ArrowUpRight size={14} className="text-[var(--muted-foreground)] group-hover:text-[var(--ssg-green)]" />
          </div>
          {item.description && (
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{item.description}</p>
          )}
        </Link>
      ))}
    </div>
  );
}
