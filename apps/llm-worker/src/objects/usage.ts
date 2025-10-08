interface UsageState {
  day: string;
  dayCount: number;
  month: string;
  monthCount: number;
}

export interface UsageResponse {
  validatedAt: number | undefined;
  dayCount: number;
  monthCount: number;
}

export interface CheckResponse {
  validatedAt: number | undefined;
}

// Durable Object to track usage by user id or fingerprint
export class Usage {
  constructor(private state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    switch (url.pathname) {
      case "/usage":
        return this.handleUsage();
      case "/validate":
        return this.handleValidate();
      case "/check":
        return this.handleCheck();
      case "/credit":
        return this.handleCredit();
      default:
        console.error({
          message: "UsageDurableObject: Invalid path in request",
          path: url.pathname,
        });
        return new Response("Not found", { status: 404 });
    }
  }

  private async handleUsage(): Promise<Response> {
    const storedPromise = this.state.storage.get<UsageState>("usage");
    const validatedAtPromise = this.state.storage.get<number>("validatedAt");

    const [stored, validatedAt] = await Promise.all([
      storedPromise,
      validatedAtPromise,
    ]);

    const incremented = this.incrementCounters(stored);

    this.state.waitUntil(
      this.state.storage.put<UsageState>("usage", incremented)
    );

    return Response.json({
      validatedAt,
      dayCount: incremented.dayCount,
      monthCount: incremented.monthCount,
    } satisfies UsageResponse);
  }

  private incrementCounters(stored: UsageState | undefined): UsageState {
    const now = new Date();
    const day = now.toISOString().slice(0, 10); // UTC day: YYYY-MM-DD
    const month = day.slice(0, 7); // UTC month: YYYY-MM

    const existingDay = stored?.day;
    const existingDayCount = stored?.dayCount ?? 0;
    const existingMonth = stored?.month;
    const existingMonthCount = stored?.monthCount ?? 0;

    const dayCount = existingDay === day ? existingDayCount + 1 : 1;
    const monthCount = existingMonth === month ? existingMonthCount + 1 : 1;

    return { day, dayCount, month, monthCount };
  }

  private async handleValidate(): Promise<Response> {
    const now = Date.now();
    this.state.waitUntil(this.state.storage.put("validatedAt", now));
    return Response.json({ validatedAt: now });
  }

  private async handleCheck(): Promise<Response> {
    const validatedAt = await this.state.storage.get<number>("validatedAt");
    return Response.json({
      validatedAt,
    } satisfies CheckResponse);
  }

  private async handleCredit(): Promise<Response> {
    const stored = await this.state.storage.get<UsageState>("usage");
    if (stored) {
      await this.state.storage.put<UsageState>("usage", {
        ...stored,
        dayCount: stored.dayCount - 1,
        monthCount: stored.monthCount - 1,
      });
    }
    return Response.json(null);
  }
}

export function getUsageDO(env: Env, userKey: string) {
  const ns = env.USAGE;
  const id = ns.idFromName(userKey);
  return ns.get(id);
}
