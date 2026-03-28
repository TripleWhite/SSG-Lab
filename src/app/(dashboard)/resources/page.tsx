import { Header } from "@/components/nav/header";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ResourceItem {
  name: string;
  tags: readonly string[];
}

interface ResourceSectionProps {
  title: string;
  items: readonly ResourceItem[];
}

const EMPLOYEE_CONNECTIONS: readonly ResourceItem[] = [
  { name: "Alice", tags: ["AWS", "Sequoia", "Google Cloud"] },
  { name: "Bob", tags: ["YC Alumni", "Hiring Pool"] },
  { name: "Carol", tags: ["Tencent", "Alibaba Cloud", "Matrix"] },
];

const LP_INVESTOR_NETWORK: readonly ResourceItem[] = [
  { name: "Sequoia Scout", tags: ["AI", "Fintech"] },
  { name: "Matrix Partners", tags: ["Enterprise SaaS"] },
  { name: "Angel Dr. Chen", tags: ["Healthcare AI"] },
];

const PARTNER_PROGRAMS: readonly ResourceItem[] = [
  { name: "AWS Activate", tags: ["credits $100k"] },
  { name: "Google for Startups", tags: ["credits", "GDG"] },
  { name: "ZhangLaw", tags: ["incorporation", "IP"] },
];

const MENTORS: readonly ResourceItem[] = [
  { name: "James Wang", tags: ["B2B Sales", "SaaS GTM"] },
  { name: "Dr. Li Ming", tags: ["AI/ML", "Robotics"] },
  { name: "Sarah Zhou", tags: ["Product Strategy", "UX"] },
];

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

export default function ResourcesPage() {
  return (
    <div className="space-y-8">
      <Header
        title="Resources"
        description="Accelerator resource graph — connections, LPs, mentors, partners"
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <ResourceSection
          title="Employee Connections"
          items={EMPLOYEE_CONNECTIONS}
        />
        <ResourceSection
          title="LP / Investor Network"
          items={LP_INVESTOR_NETWORK}
        />
        <ResourceSection title="Partner Programs" items={PARTNER_PROGRAMS} />
        <ResourceSection title="Mentors" items={MENTORS} />
      </div>
    </div>
  );
}
