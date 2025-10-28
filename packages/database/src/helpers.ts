import { timestamp } from "drizzle-orm/pg-core";

export const timestampTz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });
export const timestampTzNow = (name: string) =>
  timestampTz(name).defaultNow().notNull();
export const timestampTzNowUpdated = (name: string) =>
  timestampTz(name)
    .defaultNow()
    .notNull()
    .$onUpdate(() => /* @__PURE__ */ new Date());
