import { NextResponse } from "next/server";
import {
  buildFeishuAuthorizeUrl,
  consumeOAuthState,
  createOAuthState,
  createRoleAwareSession,
  exchangeCodeForToken,
  fetchFeishuUser,
  isFeishuAuthConfigured,
  setSessionCookie,
} from "@/lib/auth";
import { buildLoginRedirectUrl } from "@/lib/auth-logic";

function redirectToLogin(
  request: Request,
  error: string,
  nextPath?: string | null,
) {
  return NextResponse.redirect(
    buildLoginRedirectUrl(request.url, error, nextPath),
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const providerError = url.searchParams.get("error");

  if (!isFeishuAuthConfigured()) {
    return redirectToLogin(
      request,
      "feishu_not_configured",
      url.searchParams.get("next"),
    );
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (providerError) {
    const statePayload = await consumeOAuthState(state);
    return redirectToLogin(
      request,
      providerError === "access_denied" ? "oauth_denied" : "oauth_failed",
      statePayload?.nextPath ?? null,
    );
  }

  if (!code) {
    const nextPath = url.searchParams.get("next") ?? "/";
    const csrfState = await createOAuthState(nextPath);
    return NextResponse.redirect(buildFeishuAuthorizeUrl(csrfState));
  }

  const statePayload = await consumeOAuthState(state);
  if (!statePayload) {
    return redirectToLogin(request, "invalid_state");
  }

  try {
    const accessToken = await exchangeCodeForToken(code);
    const user = await fetchFeishuUser(accessToken);
    await setSessionCookie(createRoleAwareSession(user));
    return NextResponse.redirect(new URL(statePayload.nextPath, request.url));
  } catch {
    return redirectToLogin(request, "oauth_failed", statePayload.nextPath);
  }
}
