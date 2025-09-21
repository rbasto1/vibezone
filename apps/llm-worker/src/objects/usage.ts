interface UsageState {
  day: string;
  dayCount: number;
  month: string;
  monthCount: number;
}

export interface UsageResponse {
  dayCount: number;
  monthCount: number;
}

// Durable Object to track usage by user id or fingerprint
export class Usage {
  constructor(private state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    switch (url.pathname) {
      case "/check":
        return this.handleCheck();
      default:
        console.error({
          message: "UsageDurableObject: Invalid path in request",
          path: url.pathname,
        });
        return new Response("Not found", { status: 404 });
    }
  }

  private async handleCheck(): Promise<Response> {
    const stored = await this.state.storage.get<UsageState>("usage");

    const incremented = this.incrementCounters(stored);

    this.state.waitUntil(
      this.state.storage.put<UsageState>("usage", incremented)
    );

    return Response.json({
      dayCount: incremented.dayCount,
      monthCount: incremented.monthCount,
    } satisfies UsageResponse);
  }

  private incrementCounters(stored: UsageState | undefined) {
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
}
