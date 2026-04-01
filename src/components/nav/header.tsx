import { SectionBadge } from "@/components/ui/section-badge";

interface HeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
}

export function Header({ title, description, eyebrow }: HeaderProps) {
  return (
    <div className="mb-8 border-b border-[var(--border)]/70 pb-6">
      <SectionBadge>{eyebrow ?? title}</SectionBadge>
      <h1 className="mt-4 max-w-4xl text-3xl font-semibold italic tracking-tight sm:text-4xl">
        {title}
      </h1>
      {description && (
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
          {description}
        </p>
      )}
    </div>
  );
}
