import { sendEmailWithResend } from "@/lib/resend";

import type { NextMiddleware } from "next/server";
import { runUpdateUsage } from "./job";

const SUPPORT_EMAIL = "support@vibezone.ai";
const JOB_NAME = "update-usage";

export const POST: NextMiddleware = (_request, context) => {
  context.waitUntil(
    runUpdateUsage().catch((error) => {
      console.error("Failed to run update usage job:", error);
      return notifyFailure(error).catch((notifyError) => {
        console.error(
          "Failed to send update usage job failure notification:",
          notifyError
        );
      });
    })
  );

  return new Response("ok");
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const getErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack ?? undefined,
    };
  }
  if (typeof error === "string") {
    return { message: error };
  }
  try {
    return { message: JSON.stringify(error, null, 2) };
  } catch {
    return { message: String(error) };
  }
};

const notifyFailure = (error: unknown) => {
  const { message, stack } = getErrorDetails(error);
  const timestamp = new Date().toISOString();
  const htmlParts = [
    `<p>The ${JOB_NAME} job failed at ${escapeHtml(timestamp)}.</p>`,
    `<p><strong>Message:</strong> ${escapeHtml(message)}</p>`,
  ];
  if (stack) {
    htmlParts.push(
      "<p><strong>Stack trace:</strong></p>",
      `<pre>${escapeHtml(stack)}</pre>`
    );
  }

  return sendEmailWithResend({
    to: SUPPORT_EMAIL,
    subject: `Job failure: ${JOB_NAME}`,
    html: htmlParts.join("\n"),
  });
};
