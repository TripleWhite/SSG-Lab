import { DynamicPage } from "@/components/dynamic-page";
import { getPageData } from "@/lib/pages";

export const revalidate = 30;

export default async function MatchingPage() {
  const data = await getPageData("matching");
  if (!data) {
    return <p className="p-8 text-[var(--muted-foreground)]">Matching page not generated yet.</p>;
  }
  return <DynamicPage data={data} />;
}
