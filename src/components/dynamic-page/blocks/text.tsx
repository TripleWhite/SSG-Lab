export function TextBlock({ content }: { content: string }) {
  // Simple markdown-ish rendering: **bold**, *italic*, `code`, newlines
  const html = content
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="rounded bg-[var(--muted)] px-1.5 py-0.5 text-xs">$1</code>')
    .replace(/\n/g, "<br />");

  return (
    <div
      className="prose-sm text-sm leading-relaxed text-[var(--muted-foreground)] [&_strong]:text-[var(--foreground)] [&_em]:text-[var(--foreground)]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
