const usage: Record<string, number> = {};

export async function checkUsage(headers: Headers, token: string) {
  const headersObj = Object.fromEntries(headers.entries());
  console.debug(
    "Anon request, fingerprinting from",
    JSON.stringify(headersObj)
  );

  const data = {
    ip: headers.get("CF-Connecting-IP"),
    ip6: headers.get("CF-Connecting-IPv6"),
    xFFor: headers.get("X-Forwarded-For"),
    userAgent: headers.get("User-Agent"),
    languages: headers.get("Accept-Language"),
    token,
  };
  console.debug("data", data);

  const hash = await createHash(data);
  console.debug("hash", hash);

  usage[hash] ??= usage[hash] || 0 + 1;
  if (usage[hash] > 20) {
    console.warn(`Too many requests, denying (${usage[hash]})`);
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  console.debug(`Allowing (${usage[hash]})`);

  return null;
}

async function createHash(data: unknown) {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(JSON.stringify(data))
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return btoa(String.fromCharCode(...hashArray));
}
