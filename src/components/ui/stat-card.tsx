import { Card } from "./card";
import { AnimatedNumber } from "./animated-number";
import { type ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: string;
  animated?: boolean;
}

/**
 * Parse a stat value like "3/3", "87%", or 42 and return
 * { number, prefix, suffix } so the numeric part can be animated.
 */
function parseStatValue(value: string | number): {
  number: number;
  prefix: string;
  suffix: string;
} | null {
  if (typeof value === "number") {
    return { number: value, prefix: "", suffix: "" };
  }

  // Match patterns like "87%", "3/3", "$42k"
  const match = value.match(/^([^0-9]*)(\d+)(.*)$/);
  if (match) {
    return {
      prefix: match[1],
      number: parseInt(match[2], 10),
      suffix: match[3],
    };
  }

  return null;
}

export function StatCard({ label, value, icon, trend, animated }: StatCardProps) {
  const parsed = animated ? parseStatValue(value) : null;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">
            {parsed ? (
              <AnimatedNumber
                value={parsed.number}
                prefix={parsed.prefix}
                suffix={parsed.suffix}
              />
            ) : (
              value
            )}
          </p>
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
