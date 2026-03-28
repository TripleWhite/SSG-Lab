interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>}
    </div>
  );
}
