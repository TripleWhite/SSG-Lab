import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";

export default function Home() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-4xl font-bold">SSG Dashboard</h1>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Projects" value={42} trend="+3 this week" />
        <StatCard label="Insights" value={12} />
        <StatCard label="Agents" value="3/3" />
        <StatCard label="Match Rate" value="87%" />
      </div>
      <Card hover>
        <CardTitle>DesignAI</CardTitle>
        <Badge variant="success">On Track</Badge>
        <Badge variant="warning">Follow-up Due</Badge>
      </Card>
      <div className="flex gap-3">
        <Button>Primary Action</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
    </div>
  );
}
