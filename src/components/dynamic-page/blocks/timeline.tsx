import { Badge } from "@/components/ui/badge";
import type { TimelineEvent } from "../types";

export function TimelineBlock({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="relative space-y-0">
      {events.map((event, i) => (
        <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
          {/* Vertical line */}
          {i < events.length - 1 && (
            <div className="absolute left-[5px] top-3 h-full w-px bg-[var(--border)]" />
          )}
          {/* Dot */}
          <div className="relative mt-1.5 h-[11px] w-[11px] flex-none rounded-full border-2 border-[var(--ssg-green)] bg-[var(--background)]" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                {event.date}
              </p>
              {event.badge && (
                <Badge variant={event.badge.variant}>{event.badge.text}</Badge>
              )}
            </div>
            <p className="mt-1 text-sm font-semibold">{event.title}</p>
            {event.description && (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {event.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
