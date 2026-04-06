import { DynamicPage } from "@/components/dynamic-page";
import { getPageData } from "@/lib/pages";

export const revalidate = 30;

export default async function AgentsPage() {
  const data = await getPageData("agents");
  if (!data) {
    return <p className="p-8 text-[var(--muted-foreground)]">Team page not generated yet.</p>;
  }
  return <DynamicPage data={data} />;
}
