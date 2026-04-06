import { DynamicPage } from "@/components/dynamic-page";
import { getPageData } from "@/lib/pages";

export const revalidate = 30;

export default async function AnalyticsPage() {
  const data = await getPageData("analytics");
  if (!data) {
    return <p className="p-8 text-[var(--muted-foreground)]">Analytics page not generated yet.</p>;
  }
  return <DynamicPage data={data} />;
}
