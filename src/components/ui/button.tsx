import { type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "outline" | "ghost";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-gradient-to-r from-[var(--ssg-green)] to-[var(--ssg-yellow)] text-[#0f172a] font-semibold hover:scale-105 hover:shadow-[0_0_15px_rgba(100,254,186,0.5)]",
  outline: "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--card-hover)]",
  ghost: "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

export function Button({ children, variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm transition-all duration-300 ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
