export function formatClockTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatRelativeTime(value: string, now = new Date()): string {
  const target = new Date(value);
  const diffMs = target.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);

  if (absMs < 60_000) {
    return diffMs < 0 ? "Just now" : "In <1m";
  }

  const units = [
    { ms: 86_400_000, suffix: "d" },
    { ms: 3_600_000, suffix: "h" },
    { ms: 60_000, suffix: "m" },
  ];

  for (const unit of units) {
    if (absMs >= unit.ms) {
      const amount = Math.round(absMs / unit.ms);
      return diffMs < 0 ? `${amount}${unit.suffix} ago` : `In ${amount}${unit.suffix}`;
    }
  }

  return "Just now";
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}

export function formatDateLabel(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function truncateText(value: string, maxLength = 120): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function isSameDay(value: string, compare = new Date()): boolean {
  const date = new Date(value);
  return (
    date.getFullYear() === compare.getFullYear() &&
    date.getMonth() === compare.getMonth() &&
    date.getDate() === compare.getDate()
  );
}

export function getWeekKey(value: string): string {
  const date = new Date(value);
  const start = new Date(date);
  const day = (start.getDay() + 6) % 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day);
  return start.toISOString().slice(0, 10);
}

export function formatWeekLabel(weekKey: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${weekKey}T00:00:00`));
}
