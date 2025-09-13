import { db, type Model, type Provider } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

const providerFields: (keyof Provider)[] = [
  "name",
  "tier",
  "order",
  "deletedAt",
];
const modelFields: (keyof Model)[] = [
  "name",
  "isChat",
  "priority",
  "isSuggested",
  "isExperimental",
  "isPremium",
  "isNew",
  "isIncluded",
  "deletedAt",
];

type Client = typeof db;

async function main() {
  const targetConnStr = process.argv[2];
  if (!targetConnStr) {
    const cmd = `${process.argv[0]} ${process.argv[1]}`;
    console.error(`Usage: ${cmd} <target-connection-string>`);
    process.exit(1);
  }

  const sourceDb = db;
  const targetDb = drizzle(targetConnStr, { schema });

  await copySuggestionGroups(sourceDb, targetDb);
  await updateProviders(sourceDb, targetDb);
  await updateModels(sourceDb, targetDb);
}

async function copySuggestionGroups(sourceDb: Client, targetDb: Client) {
  const rows = await sourceDb.select().from(schema.suggestionGroups);
  if (!rows.length) {
    console.error("No rows found in source table");
    process.exit(2);
  }

  const tableEmpty = await targetDb
    .select()
    .from(schema.suggestionGroups)
    .limit(1);

  if (tableEmpty.length) {
    console.info("Deleting existing rows from target table");
    await targetDb.delete(schema.suggestionGroups);
  }

  await targetDb.insert(schema.suggestionGroups).values(rows);

  const count = rows.length;
  console.info(`✅ Suggestion groups copied successfully: ${count} rows`);
}

async function updateProviders(sourceDb: Client, targetDb: Client) {
  const fieldsObj = providerFields.reduce(
    (acc, f) => ({ ...acc, [f]: schema.providers[f] }),
    {}
  );

  const tableEmpty = await targetDb
    .select({
      id: schema.providers.id,
      deletedAt: schema.providers.deletedAt,
      ...fieldsObj,
    })
    .from(schema.providers)
    .limit(1);
  if (!tableEmpty.length) {
    console.info("No rows found in target table");
    process.exit(3);
  }

  const rows = await sourceDb
    .select({
      id: schema.providers.id,
      deletedAt: schema.providers.deletedAt,
      ...fieldsObj,
    })
    .from(schema.providers);
  if (!rows.length) {
    console.error("No rows found in source table");
    process.exit(2);
  }

  for (const row of rows) {
    const anyDifference = Object.entries(fieldsObj).some(
      ([f, field]) => row[f as keyof typeof row] !== field
    );
    if (!anyDifference) {
      continue;
    }

    const result = await targetDb
      .update(schema.providers)
      .set(row)
      .where(eq(schema.providers.id, row.id));
    if (!result.rowCount) {
      console.error(
        `Provider ${row.id} not found in target table (deleted=${!!row.deletedAt})`
      );
    } else {
      console.info(`☑️ Provider ${row.id} updated`);
    }
  }
  const count = rows.length;
  console.info(`✅ Providers updated successfully: ${count} rows`);
}

async function updateModels(sourceDb: Client, targetDb: Client) {
  const fieldsObj = modelFields.reduce(
    (acc, f) => ({ ...acc, [f]: schema.models[f] }),
    {}
  );

  const tableEmpty = await targetDb
    .select({
      id: schema.models.id,
      deletedAt: schema.models.deletedAt,
      ...fieldsObj,
    })
    .from(schema.models);
  if (!tableEmpty.length) {
    console.info("No rows found in target table");
    process.exit(6);
  }

  const rows = await sourceDb
    .select({
      id: schema.models.id,
      deletedAt: schema.models.deletedAt,
      ...fieldsObj,
    })
    .from(schema.models);
  if (!rows.length) {
    console.error("No rows found in source table");
    process.exit(5);
  }

  for (const row of rows) {
    const anyDifference = Object.entries(fieldsObj).some(
      ([f, field]) => row[f as keyof typeof row] !== field
    );
    if (!anyDifference) {
      continue;
    }

    const result = await targetDb
      .update(schema.models)
      .set(row)
      .where(eq(schema.models.id, row.id));
    if (!result.rowCount) {
      console.error(
        `Model ${row.id} not found in target table (deleted=${!!row.deletedAt})`
      );
    } else {
      console.info(`☑️ Model ${row.id} updated`);
    }
  }
  const count = rows.length;
  console.info(`✅ Models updated successfully: ${count} rows`);
}

main();
