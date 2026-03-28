import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = "", hover = false }: CardProps) {
  return (
    <div className={`rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 ${hover ? "transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#62feca10]" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-lg font-bold tracking-tight ${className}`}>{children}</h3>;
}

export function CardDescription({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-sm text-[var(--muted)]">{children}</p>;
}
