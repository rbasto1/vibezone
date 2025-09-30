/*
  Sets Vercel environment variables listed in turbo.json globalEnv.

  Configuration via environment variables:
  - VERCEL_TOKEN:        Required. Your Vercel API token
  - VERCEL_PROJECT:      Required. Project name or ID
  - VERCEL_TEAM_ID:      Optional. Team ID if project belongs to a team
  - VERCEL_TARGETS:      Optional. Comma list of targets; default: development,preview,production
  - VERCEL_PUBLIC_PLAIN: Optional. 'true' to send NEXT_PUBLIC_* as plain (default true). Set to 'false' to encrypt.

  Values for the env keys are read from process.env using the same key names.

  Example usage:
    VERCEL_TOKEN=... VERCEL_PROJECT=my-project \
    GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... AUTH_SECRET=... \
    RESEND_API_KEY=... \
    NEXT_PUBLIC_LLM_WORKER_URL=... \
    pnpm dlx tsx scripts/set-vercel-envs.ts
*/

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

type TurboConfig = {
  globalEnv?: string[];
};

const log = (
  level: "info" | "warn" | "error",
  msg: string,
  extra?: unknown
) => {
  const line = `[vercel-envs] ${msg}`;
  if (level === "info") console.info(line);
  else if (level === "warn") console.warn(line, extra ?? "");
  else console.error(line, extra ?? "");
};

const main = async () => {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  const project = process.env.VERCEL_PROJECT_ID;
  const targetsInput = process.env.VERCEL_TARGETS;
  const publicPlainEnv = process.env.VERCEL_PUBLIC_PLAIN;

  if (!token) {
    log("error", "Missing VERCEL_TOKEN env");
    process.exitCode = 1;
    return;
  }
  if (!project) {
    log("error", "Missing VERCEL_PROJECT env (name or id)");
    process.exitCode = 1;
    return;
  }

  const targets = (targetsInput || "development,preview,production")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const publicPlain = !publicPlainEnv || publicPlainEnv === "true";

  const turboPath = resolve(process.cwd(), "../../turbo.json");
  const raw = await readFile(turboPath, "utf8");
  const turbo = JSON.parse(raw) as TurboConfig;
  const envKeys = turbo.globalEnv;

  if (!envKeys?.length) {
    log("warn", "No globalEnv keys found in turbo.json");
    return;
  }

  const baseUrl = new URL(
    `https://api.vercel.com/v9/projects/${encodeURIComponent(project)}/env`
  );
  if (teamId) baseUrl.searchParams.set("teamId", teamId);

  for (const key of envKeys) {
    const value = process.env[key];
    if (value === undefined) {
      log("warn", `Skipping ${key}: no value in process.env`);
      continue;
    }

    const type =
      key.startsWith("NEXT_PUBLIC_") && publicPlain ? "plain" : "encrypted";

    const body = {
      key,
      value,
      // Vercel expects: ["development","preview","production"]
      target: targets as ("development" | "preview" | "production")[],
      type,
    } as const;

    const resp = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "<no-body>");
      const data = safeParse<{ error?: { code?: string } }>(text);
      if (data?.error?.code === "ENV_ALREADY_EXISTS") {
        log("info", `Skipping ${key}: already exists`);
        continue;
      }
      log("error", `Failed to set ${key} (${resp.status}) — response: ${text}`);
      continue;
    }

    log("info", `Set ${key} (${type}) for targets: ${targets.join(",")}`);
  }
};

main().catch((err) => {
  log("error", "Unexpected error", err);
  process.exitCode = 1;
});

function safeParse<T>(json: string): T | null {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
