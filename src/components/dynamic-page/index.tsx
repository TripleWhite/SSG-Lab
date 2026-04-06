import { Header } from "@/components/nav/header";
import { Card } from "@/components/ui/card";
import type { PageBlock, PageData } from "./types";
import { StatGridBlock } from "./blocks/stat-grid";
import { KanbanBlock } from "./blocks/kanban";
import { CardListBlock } from "./blocks/card-list";
import { TimelineBlock } from "./blocks/timeline";
import { DetailBlock } from "./blocks/detail";
import { TableBlock } from "./blocks/table";
import { ChartBlock } from "./blocks/chart";
import { AlertBlock } from "./blocks/alert";
import { TextBlock } from "./blocks/text";
import { EntityCardBlock } from "./blocks/entity-card";
import { LinkGridBlock } from "./blocks/link-grid";
import { EmptyBlock } from "./blocks/empty";

function BlockRenderer({ block }: { block: PageBlock }) {
  switch (block.type) {
    case "stat-grid":
      return <StatGridBlock items={block.items} />;
    case "kanban":
      return <KanbanBlock columns={block.columns} />;
    case "card-list":
      return <CardListBlock items={block.items} />;
    case "timeline":
      return <TimelineBlock events={block.events} />;
    case "section":
      return (
        <Card>
          <h3 className="text-xl font-bold tracking-tight">{block.title}</h3>
          {block.subtitle && (
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{block.subtitle}</p>
          )}
          <div className="mt-5 space-y-5">
            {block.blocks.map((child, i) => (
              <BlockRenderer key={i} block={child} />
            ))}
          </div>
        </Card>
      );
    case "detail":
      return <DetailBlock fields={block.fields} />;
    case "table":
      return <TableBlock columns={block.columns} rows={block.rows} />;
    case "chart":
      return <ChartBlock chart_type={block.chart_type} data={block.data} max={block.max} />;
    case "alert":
      return <AlertBlock severity={block.severity} title={block.title} body={block.body} />;
    case "text":
      return <TextBlock content={block.content} />;
    case "entity-card":
      return <EntityCardBlock entity={block.entity} />;
    case "link-grid":
      return <LinkGridBlock items={block.items} />;
    case "empty":
      return <EmptyBlock message={block.message} />;
    default:
      return null;
  }
}

export function DynamicPage({ data }: { data: PageData }) {
  return (
    <div className="space-y-6">
      <Header
        title={data.title}
        description={data.subtitle}
        eyebrow={data.eyebrow}
      />
      {data.blocks.map((block, i) => (
        <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
          <BlockRenderer block={block} />
        </div>
      ))}
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]/60">
        Generated {new Date(data.generated_at).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </p>
    </div>
  );
}
