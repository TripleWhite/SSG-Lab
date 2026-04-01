import { Header } from "@/components/nav/header";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionBadge } from "@/components/ui/section-badge";
import type { ResourceItem } from "@/lib/types";
import { getResourceGraph } from "@/lib/mimir";

function sanitizeResourceItems(items: readonly ResourceItem[]) {
  return items.filter(
    (item) => !item.name.toLowerCase().includes("placeholder")
  );
}

function ResourceSection({ title, items, emptyState }: ResourceSectionProps) {
  return (
    <Card>
      <SectionBadge>Resource Graph</SectionBadge>
      <CardTitle className="mb-4 mt-4">{title}</CardTitle>
      {items.length > 0 ? (
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
      ) : (
        <div className="border border-dashed border-[var(--border)]/80 bg-black/20 px-4 py-5 text-sm text-[var(--muted-foreground)]">
          {emptyState}
        </div>
      )}
    </Card>
  );
}

interface ResourceSectionProps {
  title: string;
  items: readonly ResourceItem[];
  emptyState: string;
}

export default async function ResourcesPage() {
  const resourceGraph = await getResourceGraph();
  const connections = sanitizeResourceItems(resourceGraph.connections);
  const investors = sanitizeResourceItems(resourceGraph.investors);
  const programs = sanitizeResourceItems(resourceGraph.programs);
  const mentors = sanitizeResourceItems(resourceGraph.mentors);
  const isSeedData = resourceGraph.source === "seed";

  return (
    <div className="space-y-8">
      <Header
        title="Resources"
        description="Connections, investor relationships, mentors, and partner programs for the accelerator network."
        eyebrow="Network Graph"
      />

      <Card className="border-[var(--ssg-green)]/20 bg-[var(--ssg-green)]/5 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--muted-foreground)]">
            {isSeedData
              ? "Live resource connections are still being added for this workspace. Curated partner programs remain visible below."
              : "Resource connections and partner programs update automatically as new network data becomes available."}
          </p>
          <Badge variant={isSeedData ? "warning" : "success"}>
            {isSeedData ? "Connections Pending" : "Live Network"}
          </Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <ResourceSection
          title="Employee Connections"
          items={connections}
          emptyState="No employee connection records are available yet."
        />
        <ResourceSection
          title="LP / Investor Network"
          items={investors}
          emptyState="No investor or LP relationships have been added yet."
        />
        <ResourceSection
          title="Partner Programs"
          items={programs}
          emptyState="No partner programs are listed yet."
        />
        <ResourceSection
          title="Mentors"
          items={mentors}
          emptyState="No mentor records are available yet."
        />
      </div>
    </div>
  );
}
