/*
   Sets Vercel environment variables listed in turbo.json globalEnv.

   Configuration via environment variables:
   - VERCEL_TOKEN:        Required. Your Vercel API token
   - VERCEL_TEAM_ID:      Optional. Team ID if project belongs to a team
   - VERCEL_TARGETS:      Optional. Comma list of targets; default: development,preview,production
   - VERCEL_PUBLIC_PLAIN: Optional. 'true' to send NEXT_PUBLIC_* as plain (default true). Set to 'false' to encrypt.

   Values for the env keys are read from .env.vibezone and .env.multiplaia files.
   VERCEL_PROJECT is read from the respective .env files.

   Example usage:
     VERCEL_TOKEN=... \
     pnpm dlx tsx scripts/set-vercel-envs.ts
*/

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import z from "zod";

const publicPlainEnv = process.env.VERCEL_PUBLIC_PLAIN;

type TurboConfig = {
  globalEnv?: string[];
};

const parseEnvFile = (content: string): Record<string, string> => {
  const env: Record<string, string> = {};
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match?.[1]) {
      const key = match[1].trim();
      const value = match[2] || "";
      env[key] = value;
    }
  }
  return env;
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

  if (!token) {
    log("error", "Missing VERCEL_TOKEN env");
    process.exitCode = 1;
    return;
  }
  if (!teamId) {
    log("error", "Missing VERCEL_TEAM_ID env");
    process.exitCode = 1;
    return;
  }

  const deployments = [
    { envFile: ".env.vibezone" },
    { envFile: ".env.multiplaia" },
  ];

  for (const { envFile } of deployments) {
    const envPath = resolve(process.cwd(), envFile);
    const envContent = await readFile(envPath, "utf8");
    const envVars = parseEnvFile(envContent);

    const project = envVars.VERCEL_PROJECT;
    if (!project) {
      log("error", `Missing VERCEL_PROJECT in ${envFile}`);
      process.exitCode = 1;
      return;
    }

    log("info", `Setting envs for project ${project} from ${envFile}`);
    await setEnvForProject(project, { token, teamId }, envVars);
  }
};

interface VercelAuth {
  token: string;
  teamId: string;
}

async function setEnvForProject(
  project: string,
  vercelAuth: VercelAuth,
  envVars: Record<string, string>
) {
  const targetsInput = process.env.VERCEL_TARGETS;

  const targets = (targetsInput || "development,preview,production")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

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
  baseUrl.searchParams.set("teamId", vercelAuth.teamId);

  const envKeysToSet: string[] = [];
  for (const key of envKeys) {
    if (key.endsWith("*")) {
      const prefix = key.slice(0, -1);
      const matchingKeys = Object.keys(envVars).filter((k) =>
        k.startsWith(prefix)
      );
      envKeysToSet.push(...matchingKeys);
    } else {
      envKeysToSet.push(key);
    }
  }

  // Warn about variables in envVars not in turbo.json
  const turboKeysSet = new Set(envKeysToSet);
  for (const key of Object.keys(envVars)) {
    if (!turboKeysSet.has(key) && key !== "VERCEL_PROJECT") {
      log("warn", `⚠️ ${key} in .env file but not in turbo.json globalEnv`);
    }
  }

  const variables = await getAllVariables(baseUrl, vercelAuth);

  for (const key of envKeysToSet) {
    const list = variables.filter((v) => v.key === key);
    if (list.length > 1) {
      console.warn(
        `[vercel-envs] Stage-specific values found for ${key}, skipping`
      );
      continue;
    }
    const existing = list[0];

    const value = envVars[key];
    if (value === undefined) {
      if (existing) {
        log(
          "warn",
          `⛔ ${key} exists in Vercel but we have deleted it from .env file`
        );
        await deleteVariable(baseUrl, vercelAuth, existing.id);
        continue;
      }
      log("warn", `🔴 ${key}: no value in .env file`);
      continue;
    }
    if (existing?.value === value) {
      log("info", `✅ ${key} already exists in Vercel with same value`);
      continue;
    }

    if (!existing) {
      await createVariable(baseUrl, vercelAuth, {
        key,
        value,
        targets,
      });
    } else {
      await updateVariable(baseUrl, vercelAuth, {
        id: existing.id,
        key,
        value,
        targets,
      });
    }
  }

  const notInTurbo = variables.filter((v) => !turboKeysSet.has(v.key));
  for (const v of notInTurbo) {
    if (v.target.length === 1) continue; // stage-specific variables, usually from Neon
    log(
      "warn",
      `🗑️ ${v.key} exists in Vercel but we have deleted it from turbo.json`
    );
    await deleteVariable(baseUrl, vercelAuth, v.id);
  }
}

main().catch((err) => {
  log("error", "Unexpected error", err);
  process.exitCode = 1;
});

// https://vercel.com/docs/rest-api/reference/endpoints/projects/retrieve-the-environment-variables-of-a-project-by-id-or-name#option-2
const GetVariablesSchema = z.object({
  envs: z.array(
    z.object({
      id: z.string(),
      type: z.string(), // system, secret, encrypted, plain, sensitive
      value: z.string(),
      key: z.string(),
      target: z.array(z.string()),
    })
  ),
});

async function getAllVariables(baseUrl: URL, vercelAuth: VercelAuth) {
  const resp = await callVercelApi(baseUrl, vercelAuth, "GET");
  const data: unknown = await resp.json();
  const { envs } = GetVariablesSchema.parse(data);

  for (const v of envs) {
    if (v.type === "encrypted") {
      const url = new URL(baseUrl);
      url.pathname = `${baseUrl.pathname}/${v.id}`;
      const resp = await callVercelApi(url, vercelAuth, "GET");
      const data: unknown = await resp.json();
      if (
        data &&
        typeof data === "object" &&
        "value" in data &&
        typeof data.value === "string"
      ) {
        v.value = data.value;
      } else {
        console.warn(`Failed to fetch decrypted value for ${v.key}:`, data);
      }
    }
  }

  return envs;
}

async function callVercelApi(
  url: URL,
  vercelAuth: VercelAuth,
  method: string,
  body?: unknown
) {
  return await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${vercelAuth.token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function createVariable(
  baseUrl: URL,
  vercelAuth: { teamId: string; token: string },
  data: {
    key: string;
    value: string;
    targets: string[];
  }
) {
  const { key, value, targets } = data;
  const type = getVarType(key);

  const resp = await callVercelApi(baseUrl, vercelAuth, "POST", {
    key,
    value,
    // Vercel expects: ["development","preview","production"]
    target: targets,
    type,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "<no-body>");
    log(
      "error",
      `❌ Failed to set ${key} (${resp.status}) — response: ${text}`
    );
    return;
  }

  log("info", `🟢 Created ${key} (${type}) for targets: ${targets.join(",")}`);
}

async function updateVariable(
  baseUrl: URL,
  vercelAuth: { teamId: string; token: string },
  data: {
    id: string;
    key: string;
    value: string;
    targets: string[];
  }
) {
  const { id, key, value, targets } = data;
  const patchUrl = new URL(baseUrl);
  patchUrl.pathname = `${baseUrl.pathname}/${id}`;
  const type = getVarType(key);
  const updateResp = await callVercelApi(patchUrl, vercelAuth, "PATCH", {
    value,
    target: targets,
    type,
  });

  if (!updateResp.ok) {
    const updateText = await updateResp.text().catch(() => "<no-body>");
    log(
      "error",
      `❌ Failed to update ${key} (${updateResp.status}) — response: ${updateText} (id=${id})`
    );
  }

  log("info", `🟢 Updated ${key} (${type}) for targets: ${targets.join(",")}`);
}

function getVarType(key: string) {
  return key.startsWith("NEXT_PUBLIC_") && publicPlainEnv !== "false"
    ? "plain"
    : "encrypted";
}

async function deleteVariable(
  baseUrl: URL,
  vercelAuth: VercelAuth,
  id: string
) {
  const deleteUrl = new URL(baseUrl);
  deleteUrl.pathname = `${baseUrl.pathname}/${id}`;
  const deleteResp = await callVercelApi(deleteUrl, vercelAuth, "DELETE");
  if (!deleteResp.ok) {
    const deleteText = await deleteResp.text().catch(() => "<no-body>");
    log(
      "error",
      `❌ Failed to delete ${id} (${deleteResp.status}) — response: ${deleteText}`
    );
  }
}
