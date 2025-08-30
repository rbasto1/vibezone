import { Assistant, type PanelConfig } from "./assistant";
import { db } from "@/db";
import { models } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export default async function Home() {
  async function getByPriority(priority: number) {
    const rows = await db
      .select({ id: models.id, providerId: models.providerId, name: models.name })
      .from(models)
      .where(
        and(
          eq(models.priority, priority),
          isNull(models.deletedAt),
          sql`'text' = ANY(${models.architectureInputModalities})`,
          sql`'text' = ANY(${models.architectureOutputModalities})`
        )
      )
      .limit(1);
    return rows[0];
  }

  const m1 = await getByPriority(1);
  const m2 = await getByPriority(2);

  const initialPanels: PanelConfig[] = [];
  if (m1) {
    initialPanels.push({
      id: randomUUID(),
      provider: m1.providerId,
      model: m1.id,
      temperature: 0.1,
    });
  }
  if (m2) {
    initialPanels.push({
      id: randomUUID(),
      provider: m2.providerId,
      model: m2.id,
      temperature: 0.1,
    });
  }
  if (initialPanels.length === 0) {
    // Fallback: pick any text-capable models
    const rows = await db
      .select({ id: models.id, providerId: models.providerId, name: models.name })
      .from(models)
      .where(
        and(
          isNull(models.deletedAt),
          sql`'text' = ANY(${models.architectureInputModalities})`,
          sql`'text' = ANY(${models.architectureOutputModalities})`
        )
      )
      .limit(2);
    for (const r of rows) {
      initialPanels.push({
        id: randomUUID(),
        provider: r.providerId,
        model: r.id,
        temperature: 0.1,
      });
    }
  }

  return <Assistant initialPanels={initialPanels} />;
}
