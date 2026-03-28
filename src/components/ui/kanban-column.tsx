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
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--border)] text-xs">{count}</span>
      </div>
      <div className="flex-1 space-y-3">{children}</div>
    </div>
  );
}
