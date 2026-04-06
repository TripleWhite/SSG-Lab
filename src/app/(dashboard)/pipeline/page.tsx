import { DynamicPage } from "@/components/dynamic-page";
import { getPageData } from "@/lib/pages";

export const revalidate = 30;

export default async function PipelinePage() {
  const data = await getPageData("pipeline");
  if (!data) {
    return <p className="p-8 text-[var(--muted-foreground)]">Pipeline page not generated yet.</p>;
  }
  return <DynamicPage data={data} />;
}
