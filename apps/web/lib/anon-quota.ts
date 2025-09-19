"use client";

const STORAGE_KEY = "vz_anon_msg_usage";
const DAILY_LIMIT = 20;

type Usage = {
  date: string; // YYYY-MM-DD
  count: number;
};

function today(): string {
  // Use local date to match user expectation
  const d = new Date();
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${da}`;
}

function read(): Usage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: today(), count: 0 };
    const parsed = JSON.parse(raw) as Usage;
    if (!parsed || typeof parsed.count !== "number" || !parsed.date) {
      return { date: today(), count: 0 };
    }
    if (parsed.date !== today()) return { date: today(), count: 0 };
    return parsed;
  } catch {
    return { date: today(), count: 0 };
  }
}

function write(u: Usage) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    try {
      // Notify listeners in-page about quota changes
      window.dispatchEvent(
        new CustomEvent("vz:anon-quota", { detail: { remaining: Math.max(0, DAILY_LIMIT - u.count) } })
      );
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
}

export function getAnonRemaining(): number {
  const u = read();
  return Math.max(0, DAILY_LIMIT - u.count);
}

export function canAnonSend(count: number = 1): boolean {
  return getAnonRemaining() >= Math.max(1, count);
}

export function consumeAnonSend(count: number = 1): number {
  const u = read();
  const inc = Math.max(1, count);
  const next = { date: today(), count: Math.min(DAILY_LIMIT, u.count + inc) };
  write(next);
  return Math.max(0, DAILY_LIMIT - next.count);
}

export const ANON_DAILY_LIMIT = DAILY_LIMIT;
