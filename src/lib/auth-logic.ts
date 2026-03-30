export type UserRole = "board" | "employee";

interface SessionLike {
  role: UserRole;
}

export function normalizeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export function normalizeBoardIdentifier(value: string): string {
  return value.includes("@") ? value.toLowerCase() : value;
}

export function parseBoardIdentifiers(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => normalizeBoardIdentifier(entry.trim()))
      .filter(Boolean)
  );
}

export function resolveUserRole(
  openId: string,
  email: string | undefined,
  boardIdentifiers: Set<string>
): UserRole {
  if (boardIdentifiers.size === 0) {
    return "employee";
  }

  const normalizedEmail = email ? normalizeBoardIdentifier(email) : null;
  return boardIdentifiers.has(openId) ||
    (normalizedEmail ? boardIdentifiers.has(normalizedEmail) : false)
    ? "board"
    : "employee";
}

export function isFeishuAuthConfiguredFromEnv(env: NodeJS.ProcessEnv): boolean {
  return Boolean(
    env.FEISHU_APP_ID &&
      env.FEISHU_APP_SECRET &&
      env.NEXTAUTH_SECRET &&
      env.NEXTAUTH_URL
  );
}

export function getAuthRedirectPath(
  session: SessionLike | null,
  requiredRole: UserRole = "employee"
): string | null {
  if (!session) {
    return "/login";
  }

  if (requiredRole === "board" && session.role !== "board") {
    return "/?notice=board_access_required";
  }

  return null;
}

export function buildLoginRedirectUrl(
  requestUrl: string,
  error: string,
  nextPath?: string | null
): string {
  const loginUrl = new URL("/login", requestUrl);
  loginUrl.searchParams.set("error", error);
  if (nextPath) {
    loginUrl.searchParams.set("next", nextPath);
  }
  return loginUrl.toString();
}
