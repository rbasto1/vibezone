import { env } from "cloudflare:workers";
import type { VibezoneContext } from "../worker";

interface ClerkSession {
  object: "session";
  id: string;
  user_id: string;
  client_id: string;
  actor: null;
  status:
    | "active"
    | "revoked"
    | "ended"
    | "expired"
    | "removed"
    | "abandoned"
    | "replaced"
    | "pending";
  last_active_organization_id: null;
  last_active_at: 1;
  latest_activity: {
    object: string;
    id: string;
    device_type: string;
    is_mobile: true;
    browser_name: string;
    browser_version: string;
    ip_address: string;
    city: string;
    country: string;
  };
  expire_at: 1;
  abandon_at: 1;
  updated_at: 1;
  created_at: 1;
  tasks: unknown[];
}

export async function getSession(
  token: string,
  origin: VibezoneContext["origin"]
) {
  const clerkSecretKey =
    origin === "multipla.ia.br"
      ? env.CLERK_SECRET_KEY_MULTIPLAIA
      : env.CLERK_SECRET_KEY;
  const response = await fetch(`https://api.clerk.com/v1/sessions/${token}`, {
    headers: {
      Authorization: `Bearer ${clerkSecretKey}`,
    },
  });
  if (!response.ok) {
    return null;
  }
  const body = (await response.json()) as ClerkSession;

  return body.status === "active" ? body.user_id : null;
}
