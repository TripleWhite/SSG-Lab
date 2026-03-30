export type RuntimeStatus = "configured" | "partial" | "missing";

export interface RuntimeCheck {
  key: string;
  title: string;
  description: string;
  envVars: string[];
  missingVars: string[];
  status: RuntimeStatus;
}

export interface RuntimeSection {
  title: string;
  description: string;
  checks: RuntimeCheck[];
}

function hasValue(value: string | undefined): boolean {
  return Boolean(value && value.trim());
}

function getStatus(envVars: string[]): RuntimeStatus {
  const presentCount = envVars.filter((name) => hasValue(process.env[name])).length;

  if (presentCount === 0) {
    return "missing";
  }

  if (presentCount === envVars.length) {
    return "configured";
  }

  return "partial";
}

function buildCheck(
  key: string,
  title: string,
  description: string,
  envVars: string[]
): RuntimeCheck {
  return {
    key,
    title,
    description,
    envVars,
    missingVars: envVars.filter((name) => !hasValue(process.env[name])),
    status: getStatus(envVars),
  };
}

export function getBoardRoleMappingCheck(): RuntimeCheck {
  return buildCheck(
    "board-role-mapping",
    "Board Role Mapping",
    "Required if Analytics and Settings should stay available to board users after Feishu sign-in. When missing, authenticated users default to employee access.",
    ["BOARD_FEISHU_OPEN_IDS"]
  );
}

export function getRuntimeSections(): RuntimeSection[] {
  return [
    {
      title: "Control Plane",
      description: "Paperclip access needed for the live dashboard routes.",
      checks: [
        buildCheck(
          "paperclip",
          "Paperclip API",
          "Required for Overview, Pipeline, Agents, Analytics, and the live task hierarchy.",
          ["PAPERCLIP_API_URL", "PAPERCLIP_API_KEY", "PAPERCLIP_COMPANY_ID"]
        ),
      ],
    },
    {
      title: "Data Graph",
      description: "Mimir access powers resources and any future live sourcing or matching feeds.",
      checks: [
        buildCheck(
          "mimir",
          "Mimir API",
          "Required for resource graph data and future sourcing or matching records.",
          ["MIMIR_API_URL", "MIMIR_API_KEY", "MIMIR_USER_ID"]
        ),
      ],
    },
    {
      title: "Authentication & Deploy",
      description: "Feishu sign-in is wired, but runtime configuration still determines whether the callback can complete safely.",
      checks: [
        buildCheck(
          "feishu",
          "Feishu OAuth",
          "Required for the live Feishu authorize redirect and callback token exchange.",
          ["FEISHU_APP_ID", "FEISHU_APP_SECRET"]
        ),
        buildCheck(
          "session",
          "Session & App URL",
          "Required to sign session cookies and generate a stable callback URL for the dashboard.",
          ["NEXTAUTH_SECRET", "NEXTAUTH_URL"]
        ),
        getBoardRoleMappingCheck(),
      ],
    },
  ];
}

export function getFeishuAuthCheck(): RuntimeCheck {
  return buildCheck(
    "feishu-auth",
    "Feishu OAuth",
    "Required for the active Feishu sign-in route, callback exchange, and signed dashboard session.",
    ["FEISHU_APP_ID", "FEISHU_APP_SECRET", "NEXTAUTH_SECRET", "NEXTAUTH_URL"]
  );
}
