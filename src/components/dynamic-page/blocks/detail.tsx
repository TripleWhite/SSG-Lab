import { Badge } from "@/components/ui/badge";
import type { DetailField } from "../types";

export function DetailBlock({ fields }: { fields: DetailField[] }) {
  return (
    <dl className="divide-y divide-[var(--border)]">
      {fields.map((field, i) => (
        <div key={i} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <dt className="text-sm text-[var(--muted-foreground)] flex-shrink-0">{field.label}</dt>
          <dd className="text-right text-sm font-medium">
            {field.type === "badge" ? (
              <Badge variant={field.badge_variant}>{field.value}</Badge>
            ) : field.type === "link" && field.href ? (
              <a
                href={field.href}
                className="text-[var(--ssg-green)] hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {field.value}
              </a>
            ) : (
              field.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
