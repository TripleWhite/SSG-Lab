import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { EntityCardData } from "../types";

const TYPE_LABELS: Record<EntityCardData["type"], string> = {
  project: "Project",
  person: "Person",
  company: "Company",
};

export function EntityCardBlock({ entity }: { entity: EntityCardData }) {
  const inner = (
    <Card hover>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
            {TYPE_LABELS[entity.type]}
          </p>
          <h4 className="mt-1 text-lg font-bold">{entity.name}</h4>
          {entity.one_liner && (
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{entity.one_liner}</p>
          )}
        </div>
        {entity.badges && entity.badges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entity.badges.map((b, i) => (
              <Badge key={i} variant={b.variant}>{b.text}</Badge>
            ))}
          </div>
        )}
      </div>
      {entity.fields && entity.fields.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
          {entity.fields.map((f, i) => (
            <div key={i}>
              <dt className="text-xs text-[var(--muted-foreground)]">{f.label}</dt>
              <dd className="text-sm font-medium">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );

  return entity.href ? <Link href={entity.href}>{inner}</Link> : inner;
}
