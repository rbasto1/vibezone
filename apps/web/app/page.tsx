import { db } from "@/db";
import { models } from "@/db/schema";
import { randomUUID } from "crypto";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { Assistant, MAX_PANELS, type PanelConfig } from "./assistant";

export default async function Home() {
  const rows = await db
    .select({ id: models.id, providerId: models.providerId, name: models.name })
    .from(models)
    .where(
      and(
        isNotNull(models.priority),
        isNull(models.deletedAt),
        eq(models.isChat, true)
      )
    )
    .orderBy(models.priority)
    .limit(MAX_PANELS);

  const initialPanels = rows.map(
    (r): PanelConfig => ({
      id: randomUUID(),
      provider: r.providerId,
      model: r.id,
    })
  );

  return <Assistant initialPanels={initialPanels} />;
}
