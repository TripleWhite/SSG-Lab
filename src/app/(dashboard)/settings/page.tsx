import { Header } from "@/components/nav/header";
import { Card, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <Header
        title="Settings"
        description="System configuration (Board only)"
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card>
          <CardTitle className="mb-3">Agent Configuration</CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage individual agent schedules, model selection, token budgets,
            and prompt templates. Changes take effect on the next heartbeat
            cycle.
          </p>
        </Card>

        <Card>
          <CardTitle className="mb-3">Heartbeat Schedule</CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">
            Configure the cron schedule for each agent&apos;s heartbeat
            interval. Adjust frequency, maintenance windows, and quiet-hours
            for off-peak cost savings.
          </p>
        </Card>

        <Card>
          <CardTitle className="mb-3">Budget &amp; Limits</CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">
            Set daily and monthly token spend caps per agent and for the entire
            system. Alerts trigger when usage reaches 80% of any configured
            threshold.
          </p>
        </Card>
      </div>
    </div>
  );
}
