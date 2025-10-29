import { env } from "cloudflare:workers";
import type { VibezoneContext } from "../worker";

export function summarize(obj: unknown): string {
  if (obj === null) {
    return "∅";
  }
  switch (typeof obj) {
    case "string": {
      const len = obj.length;
      if (len <= 16) {
        return `"${obj}"`;
      }
      return `"string(${len})"`;
    }
    case "undefined":
      return '"undefined"';
    case "bigint":
    case "number":
    case "boolean":
      return obj.toString();
    case "object":
      if (Array.isArray(obj)) {
        const len = obj.length;
        if (!obj.length) {
          return "[]";
        }
        if (obj.every((elem) => elem === null)) {
          return `["null[${len}]"]`;
        }
        for (const type of ["string", "number", "boolean", "bigint"] as const) {
          let hasNull = false;
          if (
            obj.every((elem) => {
              if (elem === null) {
                hasNull = true;
                return true;
              }
              return typeof elem === type;
            })
          ) {
            return `["${type}${hasNull ? "?" : ""}[${len}]"]`;
          }
        }
        return "[" + obj.map(summarize).join(", ") + "]";
      }
      return (
        "{" +
        Object.entries(obj)
          .map(([key, value]): string => `${key}: ${summarize(value)}`)
          .join(", ") +
        "}"
      );
    default:
      return typeof obj;
  }
}

export function printLogInfo(ctx: VibezoneContext) {
  const { completionRequest } = ctx;
  if (env.ENVIRONMENT !== "development") {
    console.info({
      message: "Starting stream",
      model: completionRequest.config.modelId,
      plugins: completionRequest.config.plugins.join(", "),
      user: ctx.usageContext?.userId ?? ctx.usageContext?.userKey,
    });
    return;
  }

  console.info(
    [
      `🌊 Starting stream`,
      `Model: ${completionRequest.config.modelId}`,
      `Plugins: ${completionRequest.config.plugins.join(", ")}`,
      `Messages: ${summarize(completionRequest.messages)}`,
    ].join("\n")
  );
}
