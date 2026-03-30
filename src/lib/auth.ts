import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getAuthRedirectPath,
  isFeishuAuthConfiguredFromEnv,
  normalizeNextPath,
  parseBoardIdentifiers,
  resolveUserRole,
} from "./auth-logic";

export type { UserRole } from "./auth-logic";
import type { UserRole } from "./auth-logic";

export interface AuthSession {
  userId: string;
  openId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  role: UserRole;
  expiresAt: number;
}

const SESSION_COOKIE_NAME = "ssg_session";
const OAUTH_STATE_COOKIE_NAME = "ssg_oauth_state";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

interface SignedEnvelope<T> {
  data: T;
  signature: string;
}

interface OAuthState {
  nextPath: string;
  expiresAt: number;
}

interface FeishuAppTokenResponse {
  code?: number;
  msg?: string;
  app_access_token?: string;
  expire?: number;
}

interface FeishuTokenResponse {
  code?: number;
  msg?: string;
  data?: {
    access_token?: string;
  };
}

interface FeishuUserInfoResponse {
  open_id?: string;
  union_id?: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  data?: {
    open_id?: string;
    union_id?: string;
    name?: string;
    email?: string;
    avatar_url?: string;
  };
}

function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not configured.");
  }
  return secret;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string): string {
  return createHmac("sha256", getAuthSecret())
    .update(payload)
    .digest("base64url");
}

function encodeSigned<T>(data: T): string {
  const payload = base64UrlEncode(JSON.stringify(data));
  const signature = signPayload(payload);
  const envelope: SignedEnvelope<string> = {
    data: payload,
    signature,
  };
  return `${envelope.data}.${envelope.signature}`;
}

function decodeSigned<T>(value: string): T | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(payload)) as T;
  } catch {
    return null;
  }
}

function getBoardIdentifiers(): Set<string> {
  return parseBoardIdentifiers(process.env.BOARD_FEISHU_OPEN_IDS);
}

export function isFeishuAuthConfigured(): boolean {
  return isFeishuAuthConfiguredFromEnv(process.env);
}

export function buildFeishuAuthorizeUrl(state: string): string {
  const redirectUri = new URL(
    "/api/auth/feishu",
    process.env.NEXTAUTH_URL,
  ).toString();
  const params = new URLSearchParams({
    app_id: process.env.FEISHU_APP_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    state,
  });

  return `https://open.feishu.cn/open-apis/authen/v1/authorize?${params.toString()}`;
}

export async function createOAuthState(nextPath: string): Promise<string> {
  const state = encodeSigned<OAuthState>({
    nextPath: normalizeNextPath(nextPath),
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
  });

  const cookieStore = await cookies();
  cookieStore.set({
    name: OAUTH_STATE_COOKIE_NAME,
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(Date.now() + OAUTH_STATE_TTL_MS),
  });

  return state;
}

export async function consumeOAuthState(
  state: string | null,
): Promise<OAuthState | null> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(OAUTH_STATE_COOKIE_NAME)?.value ?? null;
  cookieStore.delete(OAUTH_STATE_COOKIE_NAME);

  if (!state || !stored || state !== stored) {
    return null;
  }

  const payload = decodeSigned<OAuthState>(state);
  if (!payload || payload.expiresAt < Date.now()) {
    return null;
  }

  return payload;
}

export async function setSessionCookie(
  session: Omit<AuthSession, "expiresAt">,
): Promise<void> {
  const fullSession: AuthSession = {
    ...session,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };

  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: encodeSigned(fullSession),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(fullSession.expiresAt),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(OAUTH_STATE_COOKIE_NAME);
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!value) {
    return null;
  }

  const session = decodeSigned<AuthSession>(value);
  if (!session || session.expiresAt < Date.now()) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  return session;
}

export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();
  const redirectPath = getAuthRedirectPath(session);
  if (redirectPath) {
    redirect(redirectPath);
  }
  // getAuthRedirectPath returns a redirect for null sessions, so session is guaranteed non-null here
  return session as AuthSession;
}

export async function requireBoard(): Promise<AuthSession> {
  const session = await requireSession();
  const redirectPath = getAuthRedirectPath(session, "board");
  if (redirectPath) {
    redirect(redirectPath);
  }
  return session;
}

async function getAppAccessToken(): Promise<string> {
  const response = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: process.env.FEISHU_APP_ID,
        app_secret: process.env.FEISHU_APP_SECRET,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `Feishu app_access_token request failed: ${response.status}`,
    );
  }

  const payload = (await response.json()) as FeishuAppTokenResponse;
  if (payload.code !== 0 || !payload.app_access_token) {
    throw new Error(
      `Feishu app_access_token error: ${payload.msg ?? "no token returned"}`,
    );
  }

  return payload.app_access_token;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const appToken = await getAppAccessToken();
  const response = await fetch(
    "https://open.feishu.cn/open-apis/authen/v1/oidc/access_token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${appToken}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Feishu token exchange failed: ${response.status}`);
  }

  const payload = (await response.json()) as FeishuTokenResponse;
  const token = payload.data?.access_token;
  if (!token) {
    throw new Error("Feishu token exchange returned no access token.");
  }

  return token;
}

export async function fetchFeishuUser(
  accessToken: string,
): Promise<Omit<AuthSession, "role" | "expiresAt">> {
  const response = await fetch(
    "https://open.feishu.cn/open-apis/authen/v1/user_info",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Feishu user info failed: ${response.status}`);
  }

  const payload = (await response.json()) as FeishuUserInfoResponse;
  const user = payload.data ?? payload;
  const openId = user.open_id ?? user.union_id;
  const name = user.name ?? "SSG User";

  if (!openId) {
    throw new Error("Feishu user info returned no open_id.");
  }

  return {
    userId: openId,
    openId,
    name,
    email: user.email,
    avatarUrl: user.avatar_url,
  };
}

export function createRoleAwareSession(
  user: Omit<AuthSession, "role" | "expiresAt">,
): Omit<AuthSession, "expiresAt"> {
  return {
    ...user,
    role: resolveUserRole(user.openId, user.email, getBoardIdentifiers()),
  };
}

export function createDevelopmentSecret(): string {
  return randomBytes(32).toString("base64");
}
