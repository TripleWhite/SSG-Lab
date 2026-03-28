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
          <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
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
