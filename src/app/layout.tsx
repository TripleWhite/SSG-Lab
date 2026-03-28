import type { Metadata } from "next";
import { Space_Grotesk, Outfit } from "next/font/google";
import { Sidebar } from "@/components/nav/sidebar";
import "@/styles/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SSG Accelerator Dashboard",
  description: "Agent-powered accelerator management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${outfit.variable}`}>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        <div className="flex">
          <Sidebar />
          <main className="flex-1 overflow-auto p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
