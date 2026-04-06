import { StatCard } from "@/components/ui/stat-card";
import type { StatGridItem } from "../types";
import {
  Briefcase, Radar, Target, Clock3, TrendingUp, Users, Search,
  Activity, BarChart3, Zap, Globe, Shield, DollarSign, Layers,
} from "lucide-react";
import { type ReactNode } from "react";

const ICON_MAP: Record<string, ReactNode> = {
  briefcase: <Briefcase size={20} />,
  radar: <Radar size={20} />,
  target: <Target size={20} />,
  clock: <Clock3 size={20} />,
  trending: <TrendingUp size={20} />,
  users: <Users size={20} />,
  search: <Search size={20} />,
  activity: <Activity size={20} />,
  chart: <BarChart3 size={20} />,
  zap: <Zap size={20} />,
  globe: <Globe size={20} />,
  shield: <Shield size={20} />,
  dollar: <DollarSign size={20} />,
  layers: <Layers size={20} />,
};

export function StatGridBlock({ items }: { items: StatGridItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item, i) => (
        <StatCard
          key={i}
          label={item.label}
          value={item.value}
          trend={item.trend}
          icon={item.icon ? ICON_MAP[item.icon] : undefined}
          animated
        />
      ))}
    </div>
  );
}
