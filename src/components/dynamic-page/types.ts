/* ── Block-type definitions for the DynamicPage renderer ── */

export interface StatGridItem {
  label: string;
  value: string | number;
  trend?: string;
  icon?: string;       // lucide icon name
  color?: SemanticColor;
}

export interface KanbanColumn {
  title: string;
  color?: string;
  items: KanbanItem[];
}

export interface KanbanItem {
  id: string;
  title: string;
  subtitle?: string;
  badges?: BadgeDef[];
  href?: string;
}

export interface BadgeDef {
  text: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

export interface CardListItem {
  title: string;
  subtitle?: string;
  description?: string;
  meta?: string;
  badges?: BadgeDef[];
  href?: string;
}

export interface TimelineEvent {
  date: string;
  title: string;
  description?: string;
  badge?: BadgeDef;
}

export interface DetailField {
  label: string;
  value: string;
  type?: "text" | "link" | "badge";
  badge_variant?: BadgeDef["variant"];
  href?: string;
}

export interface TableColumn {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface EntityCardData {
  name: string;
  type: "project" | "person" | "company";
  one_liner?: string;
  badges?: BadgeDef[];
  fields?: DetailField[];
  href?: string;
}

export interface LinkGridItem {
  label: string;
  description?: string;
  href: string;
  icon?: string;
}

export type SemanticColor = "blue" | "green" | "orange" | "red" | "gray";

/* ── Block union ── */

export type PageBlock =
  | { type: "stat-grid"; items: StatGridItem[] }
  | { type: "kanban"; columns: KanbanColumn[] }
  | { type: "card-list"; items: CardListItem[] }
  | { type: "timeline"; events: TimelineEvent[] }
  | { type: "section"; title: string; subtitle?: string; blocks: PageBlock[] }
  | { type: "detail"; fields: DetailField[] }
  | { type: "table"; columns: TableColumn[]; rows: Record<string, string | number>[] }
  | { type: "chart"; chart_type: "bar" | "horizontal-bar"; data: ChartDataPoint[]; max?: number }
  | { type: "alert"; severity: SemanticColor; title: string; body?: string }
  | { type: "text"; content: string }
  | { type: "entity-card"; entity: EntityCardData }
  | { type: "link-grid"; items: LinkGridItem[] }
  | { type: "empty"; message: string };

/* ── Page envelope ── */

export interface PageData {
  page: string;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  generated_at: string;
  blocks: PageBlock[];
}
