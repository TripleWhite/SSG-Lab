import { Header } from "@/components/nav/header";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ResourceItem } from "@/lib/types";
import { getResourceGraph } from "@/lib/mimir";

function ResourceSection({ title, items }: ResourceSectionProps) {
  return (
    <Card>
      <CardTitle className="mb-4">{title}</CardTitle>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.name} className="flex flex-col gap-1.5">
            <span className="font-medium text-sm">{item.name}</span>
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="default">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

interface ResourceSectionProps {
  title: string;
  items: readonly ResourceItem[];
}

export default async function ResourcesPage() {
  const resourceGraph = await getResourceGraph();

  return (
    <div className="space-y-8">
      <Header
        title="Resources"
        description="Accelerator resource graph — connections, LPs, mentors, partners"
      />

      <Card className="border-[var(--ssg-green)]/20 bg-[var(--ssg-green)]/5 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--muted-foreground)]">
            Resource data loads from Mimir when credentials are available, otherwise the seeded graph is shown.
          </p>
          {resourceGraph.source === "seed" && <Badge variant="warning">Seed Fallback</Badge>}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <ResourceSection
          title="Employee Connections"
          items={resourceGraph.connections}
        />
        <ResourceSection
          title="LP / Investor Network"
          items={resourceGraph.investors}
        />
        <ResourceSection title="Partner Programs" items={resourceGraph.programs} />
        <ResourceSection title="Mentors" items={resourceGraph.mentors} />
      </div>
    </div>
  );
}
