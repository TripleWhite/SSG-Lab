import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { KanbanColumn } from "../types";

export function KanbanBlock({ columns }: { columns: KanbanColumn[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {columns.map((col, ci) => (
        <div key={ci} className="min-w-[260px] flex-1">
          <div className="mb-3 flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: col.color ?? "var(--ssg-green)" }}
            />
            <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              {col.title}
            </h4>
            <span className="text-xs text-[var(--muted-foreground)]">
              {col.items.length}
            </span>
          </div>
          <div className="space-y-2">
            {col.items.map((item) => {
              const inner = (
                <div className="border border-[var(--border)] bg-[var(--card)] p-3 transition-colors hover:border-[var(--ssg-green)]/30">
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.subtitle && (
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {item.subtitle}
                    </p>
                  )}
                  {item.badges && item.badges.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.badges.map((b, bi) => (
                        <Badge key={bi} variant={b.variant}>{b.text}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
              return item.href ? (
                <Link key={item.id} href={item.href}>{inner}</Link>
              ) : (
                <div key={item.id}>{inner}</div>
              );
            })}
            {col.items.length === 0 && (
              <div className="border border-dashed border-[var(--border)]/50 p-3 text-center text-xs text-[var(--muted-foreground)]">
                Empty
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
