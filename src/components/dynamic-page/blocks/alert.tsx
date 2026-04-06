import type { SemanticColor } from "../types";

const COLOR_STYLES: Record<SemanticColor, string> = {
  blue: "border-sky-500/30 bg-sky-500/5 text-sky-200",
  green: "border-emerald-500/30 bg-emerald-500/5 text-emerald-200",
  orange: "border-amber-500/30 bg-amber-500/5 text-amber-200",
  red: "border-red-500/30 bg-red-500/5 text-red-200",
  gray: "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]",
};

export function AlertBlock({
  severity,
  title,
  body,
}: {
  severity: SemanticColor;
  title: string;
  body?: string;
}) {
  return (
    <div className={`border p-4 ${COLOR_STYLES[severity]}`}>
      <p className="text-sm font-semibold">{title}</p>
      {body && <p className="mt-1 text-sm opacity-80">{body}</p>}
    </div>
  );
}
