const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM_EMAIL = "no-reply@vibezone.ai";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export function sendEmailWithResend({
  to,
  subject,
  html,
  from = DEFAULT_FROM_EMAIL,
}: SendEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error("Missing RESEND_API_KEY"));
  }

  return fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  }).then((resp) =>
    resp.ok
      ? undefined
      : resp
          .text()
          .catch(() => "<no-body>")
          .then((body) => {
            throw new Error(`Resend error ${resp.status}: ${body}`);
          })
  );
}
