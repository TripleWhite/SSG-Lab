export function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-[var(--border)]/60 bg-black/10 p-6 text-center">
      <p className="text-sm text-[var(--muted-foreground)]">{message}</p>
    </div>
  );
}
