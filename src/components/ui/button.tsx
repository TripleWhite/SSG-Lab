import { type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "outline" | "ghost";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-[var(--ssg-green)] to-[var(--ssg-yellow)] text-[var(--primary-foreground)] font-semibold hover:scale-105 hover-glow",
  outline:
    "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--card-hover)] hover:border-glow",
  ghost:
    "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

export function Button({ children, variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-none px-4 py-2 text-sm transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
