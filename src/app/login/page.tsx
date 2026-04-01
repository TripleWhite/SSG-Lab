import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandLockup } from "@/components/nav/brand-lockup";
import { getSession } from "@/lib/auth";
import { getFeishuAuthCheck } from "@/lib/runtime";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParamValue = string | string[] | undefined;

interface LoginPageProps {
  searchParams?: Promise<{
    error?: SearchParamValue;
    next?: SearchParamValue;
  }>;
}

const errorCopy: Record<string, { title: string; body: string }> = {
  feishu_not_configured: {
    title: "Feishu access is unavailable",
    body: "This workspace is not ready for employee sign-in yet. Open the configured environment and try again.",
  },
  invalid_state: {
    title: "Sign-in session expired",
    body: "Your Feishu session expired before the dashboard could finish sign-in. Start the flow again from this page.",
  },
  oauth_failed: {
    title: "Feishu sign-in failed",
    body: "Feishu returned an unexpected error before the dashboard session could be created. Please retry.",
  },
  oauth_denied: {
    title: "Sign-in cancelled",
    body: "Feishu returned without approval. Start the sign-in flow again when you are ready to continue.",
  },
};

function readSearchParam(value: SearchParamValue): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  const params = (await searchParams) ?? {};
  const errorCode = readSearchParam(params.error);
  const nextPath = readSearchParam(params.next);
  const authCheck = getFeishuAuthCheck();
  const signInAvailable = authCheck.status === "configured";
  const error =
    (errorCode ? errorCopy[errorCode] : null) ??
    (signInAvailable
      ? null
      : {
          title: "Feishu access is unavailable",
          body: "Employee sign-in is temporarily unavailable in this workspace.",
        });
  const signInHref = nextPath
    ? `/api/auth/feishu?next=${encodeURIComponent(nextPath)}`
    : "/api/auth/feishu";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(100,254,186,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(214,255,115,0.08),_transparent_28%)]" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(100,254,186,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(100,254,186,0.18)_1px,transparent_1px)] [background-size:36px_36px]" />

      <div className="relative w-full max-w-lg">
        <Card className="border-[var(--ssg-green)]/20 bg-[linear-gradient(180deg,rgba(19,24,24,0.96),rgba(10,10,15,0.98))] p-8 sm:p-10">
          <BrandLockup title="Employee Access" />

          <div className="mt-10">
            <h1 className="max-w-md text-4xl font-semibold italic leading-tight tracking-tight sm:text-5xl">
              Sign in with Feishu
            </h1>
          </div>

          {error && (
            <div className="mt-6 border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm font-medium text-red-300">{error.title}</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{error.body}</p>
            </div>
          )}

          {signInAvailable ? (
            <a
              href={signInHref}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 bg-gradient-to-r from-[var(--ssg-green)] to-[var(--ssg-yellow)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary-foreground)] transition-all duration-300 hover:scale-[1.01] hover-glow"
            >
              Sign in with Feishu
            </a>
          ) : (
            <Button className="mt-8 w-full py-3 uppercase tracking-[0.18em]" disabled>
              Sign in with Feishu
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
