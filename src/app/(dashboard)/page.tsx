import { DynamicPage } from "@/components/dynamic-page";
import { getPageData } from "@/lib/pages";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";

export const revalidate = 30;

export default async function OverviewPage() {
  const data = await getPageData("overview");
  if (!data) {
    return <p className="p-8 text-[var(--muted-foreground)]">Overview page not generated yet.</p>;
  }
  return (
    <>
      <AutoRefresh intervalMs={30_000} />
      <DynamicPage data={data} />
    </>
  );
}
