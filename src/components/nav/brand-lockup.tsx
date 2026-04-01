interface BrandLockupProps {
  compact?: boolean;
  className?: string;
  label?: string;
  title?: string;
}

export function BrandLockup({
  compact = false,
  className = "",
  label = "SSG Accelerator",
  title = "Founder Operations",
}: BrandLockupProps) {
  const markClasses = compact ? "h-10 w-10" : "h-12 w-12";
  const labelClasses = compact
    ? "text-[9px] tracking-[0.24em]"
    : "text-[10px] tracking-[0.28em]";
  const titleClasses = compact ? "text-base" : "text-xl";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`relative flex ${markClasses} shrink-0 items-center justify-center overflow-hidden border border-[var(--ssg-green)]/30 bg-[linear-gradient(135deg,rgba(100,254,186,0.18),rgba(214,255,115,0.08),rgba(8,10,12,0.55))]`}
      >
        <div className="absolute inset-[3px] border border-white/5" />
        <div className="absolute -right-3 top-1.5 h-px w-8 rotate-45 bg-[var(--ssg-yellow)]/85" />
        <span className="relative text-sm font-black italic tracking-[-0.18em] text-[var(--foreground)]">
          SSG
        </span>
      </div>

      <div className="min-w-0">
        <p
          className={`${labelClasses} text-[var(--ssg-green)]/78 uppercase font-medium`}
        >
          {label}
        </p>
        <p
          className={`${titleClasses} mt-0.5 font-semibold italic tracking-tight text-[var(--foreground)]`}
        >
          {title}
        </p>
      </div>
    </div>
  );
}
