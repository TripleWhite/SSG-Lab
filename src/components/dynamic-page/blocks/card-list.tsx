import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { CardListItem } from "../types";

export function CardListBlock({ items }: { items: CardListItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const inner = (
          <div className="border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--ssg-green)]/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{item.title}</p>
              {item.badges && item.badges.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.badges.map((b, bi) => (
                    <Badge key={bi} variant={b.variant}>{b.text}</Badge>
                  ))}
                </div>
              )}
            </div>
            {item.subtitle && (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{item.subtitle}</p>
            )}
            {item.description && (
              <p className="mt-2 text-sm text-[var(--foreground)]">{item.description}</p>
            )}
            {item.meta && (
              <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                {item.meta}
              </p>
            )}
          </div>
        );
        return item.href ? (
          <Link key={i} href={item.href}>{inner}</Link>
        ) : (
          <div key={i}>{inner}</div>
        );
      })}
    </div>
  );
}
