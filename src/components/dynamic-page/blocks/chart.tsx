import type { ChartDataPoint } from "../types";

export function ChartBlock({
  chart_type,
  data,
  max: maxOverride,
}: {
  chart_type: "bar" | "horizontal-bar";
  data: ChartDataPoint[];
  max?: number;
}) {
  const maxVal = maxOverride ?? Math.max(...data.map((d) => d.value), 1);

  if (chart_type === "bar") {
    return (
      <div className="flex items-end gap-2" style={{ height: 180 }}>
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs font-medium">{d.value}</span>
            <div
              className="w-full min-w-[24px] transition-all duration-500"
              style={{
                height: `${(d.value / maxVal) * 140}px`,
                backgroundColor: d.color ?? "var(--ssg-green)",
              }}
            />
            <span className="mt-1 text-[10px] text-[var(--muted-foreground)] text-center leading-tight">
              {d.label}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // horizontal-bar
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted-foreground)]">{d.label}</span>
            <span className="font-medium">{d.value}</span>
          </div>
          <div className="h-2 w-full overflow-hidden bg-[var(--border)]">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${(d.value / maxVal) * 100}%`,
                backgroundColor: d.color ?? "var(--ssg-green)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
