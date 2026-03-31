import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { getBoardRoleMappingCheck, getFeishuAuthCheck } from "@/lib/runtime";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParamValue = string | string[] | undefined;

interface LoginPageProps {
  searchParams?: Promise<{
    error?: SearchParamValue;
    next?: SearchParamValue;
  }>;
}

const statusCopy = {
  configured: {
    label: "Config Ready",
    variant: "success" as const,
    body: "The required Feishu and session variables are present. The sign-in route is active; remaining verification is a real end-to-end callback pass in a configured environment.",
  },
  partial: {
    label: "Partial Config",
    variant: "warning" as const,
    body: "Some OAuth variables are present, but the sign-in route stays disabled until the full callback and session set is available.",
  },
  missing: {
    label: "Blocked",
    variant: "danger" as const,
    body: "Feishu OAuth is not configured in this environment, so the dashboard cannot offer a truthful sign-in flow yet.",
  },
};

const errorCopy: Record<string, { title: string; body: string }> = {
  feishu_not_configured: {
    title: "Feishu OAuth is not configured",
    body: "The login route was called without the full Feishu and session environment. Add the missing variables before retrying.",
  },
  invalid_state: {
    title: "Sign-in state expired",
    body: "The OAuth state cookie was missing or invalid on callback. Start the Feishu sign-in flow again from this page.",
  },
  oauth_failed: {
    title: "Feishu sign-in failed",
    body: "The callback reached the server, but token exchange or user lookup failed. Check the Feishu app settings and server logs, then retry.",
  },
  oauth_denied: {
    title: "Feishu sign-in was cancelled",
    body: "The authorization step returned without approval. Start the Feishu sign-in flow again when you are ready to continue.",
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
  const boardRoleCheck = getBoardRoleMappingCheck();
  const copy = statusCopy[authCheck.status];
  const error = errorCode ? errorCopy[errorCode] : null;
  const signInHref = nextPath
    ? `/api/auth/feishu?next=${encodeURIComponent(nextPath)}`
    : "/api/auth/feishu";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(100,254,186,0.14),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(214,255,115,0.08),_transparent_28%)]" />

      <div className="relative grid w-full max-w-5xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col justify-center">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.24em] text-[var(--ssg-green)]">
            SSG Accelerator
          </p>
          <h1 className="max-w-xl text-5xl font-bold leading-tight tracking-tight">
            Feishu sign-in is the last missing shell around the live dashboard.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
            The dashboard routes now render live Paperclip data or honest empty states. This page now reflects the real auth shell state: live sign-in when the environment is configured, disabled controls when it is not, and explicit callback errors when Feishu rejects or breaks the flow.
          </p>
        </div>

        <Card className="border-[var(--ssg-green)]/20 bg-[linear-gradient(180deg,rgba(19,24,24,0.96),rgba(10,10,15,0.96))] p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <CardTitle className="mb-2">Feishu Access</CardTitle>
              <p className="text-sm text-[var(--muted-foreground)]">
                Requires a configured OAuth app and a signed session secret.
              </p>
            </div>
            <Badge variant={copy.variant}>{copy.label}</Badge>
          </div>

          <p className="text-sm leading-6 text-[var(--foreground)]">{copy.body}</p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm font-medium text-red-300">{error.title}</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{error.body}</p>
            </div>
          )}

          <div className="mt-6 rounded-lg border border-[var(--border)] bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Required Variables
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {authCheck.envVars.map((name) => (
                <Badge
                  key={name}
                  variant={authCheck.missingVars.includes(name) ? "danger" : "success"}
                >
                  {name}
                </Badge>
              ))}
            </div>
          </div>

          {authCheck.missingVars.length > 0 && (
            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm font-medium text-red-300">Missing in this environment</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {authCheck.missingVars.join(", ")}
              </p>
            </div>
          )}

          {authCheck.status === "configured" && boardRoleCheck.status !== "configured" && (
            <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-medium text-amber-300">Board pages stay hidden</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Add {boardRoleCheck.envVars.join(", ")} to map Feishu users into board access.
                Until then, authenticated users default to employee permissions.
              </p>
            </div>
          )}

          {authCheck.status === "configured" ? (
            <a
              href={signInHref}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[var(--ssg-green)] to-[var(--ssg-yellow)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)] transition-all duration-300 hover:scale-105 hover-glow"
            >
              Sign in with Feishu
            </a>
          ) : (
            <Button className="mt-6 w-full" disabled>
              Sign in with Feishu
            </Button>
          )}

          <p className="mt-4 text-xs leading-5 text-[var(--muted-foreground)]">
            Authentication is enabled only when all four required env variables are present.
          </p>
        </Card>
      </div>
    </div>
  );
}
