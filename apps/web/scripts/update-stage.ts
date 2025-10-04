import { db, type Model, type Provider } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

const providerFields: (keyof Provider)[] = [
  "name",
  "tier",
  "order",
  "dataRetention",
  "privacyPolicyUrl",
  "deletedAt",
];
const modelFields: (keyof Model)[] = [
  "deletedAt",
  "isChat",
  "isExperimental",
  "isFree",
  "isIncluded",
  "isNew",
  "isPremium",
  "isSuggested",
  "name",
  "priority",
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

  await copyLocales(sourceDb, targetDb);
  await copySuggestionGroups(sourceDb, targetDb);
  await updateProviders(sourceDb, targetDb);
  await updateModels(sourceDb, targetDb);
  await copyModelTranslations(sourceDb, targetDb);
}

async function copyLocales(sourceDb: Client, targetDb: Client) {
  const rows = await sourceDb.select().from(schema.locales);
  if (!rows.length) {
    console.error("No rows found in source 'locales' table");
    process.exit(2);
  }

  const existingRows = await targetDb.select().from(schema.locales);

  const missingLocales = rows.filter(
    (row) => !existingRows.some((r) => r.id === row.id)
  );

  if (!missingLocales.length) {
    console.info("🔵 No missing locales found");
    return;
  }

  console.info(`Inserting ${missingLocales.length} missing locales`);
  await targetDb.insert(schema.locales).values(missingLocales);

  const count = rows.length;
  console.info(`✅ Locales copied successfully: ${count} rows`);
}

async function copySuggestionGroups(sourceDb: Client, targetDb: Client) {
  const rows = await sourceDb.select().from(schema.suggestionGroups);
  if (!rows.length) {
    console.error("No rows found in source 'suggestionGroups' table");
    process.exit(2);
  }

  console.info("🟡 Deleting existing rows from target tables");
  await targetDb.delete(schema.suggestionGroupTranslations);
  await targetDb.delete(schema.suggestionGroups);

  await targetDb.insert(schema.suggestionGroups).values(rows);

  await copySuggestionGroupsTranslations(sourceDb, targetDb);

  const count = rows.length;
  console.info(`✅ Suggestion groups copied successfully: ${count} rows`);
}

async function copySuggestionGroupsTranslations(
  sourceDb: Client,
  targetDb: Client
) {
  const rows = await sourceDb.select().from(schema.suggestionGroupTranslations);
  if (!rows.length) {
    console.warn("No rows found in source 'suggestionGroupTranslations' table");
    return;
  }

  await targetDb.insert(schema.suggestionGroupTranslations).values(rows);
  const count = rows.length;
  console.info(
    `✅ Suggestion group translations copied successfully: ${count} rows`
  );
}

async function updateProviders(sourceDb: Client, targetDb: Client) {
  const fieldsObj = providerFields.reduce(
    (acc, f) => ({ ...acc, [f]: schema.providers[f] }),
    {}
  );

  const targetRows = await targetDb
    .select({
      id: schema.providers.id,
      deletedAt: schema.providers.deletedAt,
      ...fieldsObj,
    })
    .from(schema.providers);
  if (!targetRows.length) {
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

  let updatedCount = 0;
  for (const row of rows) {
    const targetRow = targetRows.find((r) => r.id === row.id);
    if (!targetRow) {
      if (!row.deletedAt) {
        console.error(`⚠️ Provider ${row.id} not found in target table`);
      }
      continue;
    }
    const anyDifference = Object.keys(row).filter(
      (f) =>
        JSON.stringify(row[f as keyof typeof row]) !==
        JSON.stringify(targetRow[f as keyof typeof targetRow])
    );
    if (!anyDifference.length) {
      continue;
    }

    await targetDb
      .update(schema.providers)
      .set(row)
      .where(eq(schema.providers.id, row.id));
    console.info(`☑️ Provider ${row.id} updated (${anyDifference.join(", ")})`);
    updatedCount++;
  }
  const count = rows.length;
  console.info(
    `✅ Providers updated successfully: ${updatedCount}/${count} rows`
  );
}

async function updateModels(sourceDb: Client, targetDb: Client) {
  const fieldsObj = modelFields.reduce(
    (acc, f) => ({ ...acc, [f]: schema.models[f] }),
    {}
  );

  const targetRows = await targetDb
    .select({
      id: schema.models.id,
      deletedAt: schema.models.deletedAt,
      ...fieldsObj,
    })
    .from(schema.models);
  if (!targetRows.length) {
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

  let updatedCount = 0;
  for (const row of rows) {
    const targetRow = targetRows.find((r) => r.id === row.id);
    if (!targetRow) {
      if (!row.deletedAt) {
        console.error(`⚠️ Model ${row.id} not found in target table`);
      }
      continue;
    }
    const anyDifference = Object.keys(row).filter(
      (f) =>
        JSON.stringify(row[f as keyof typeof row]) !==
        JSON.stringify(targetRow[f as keyof typeof targetRow])
    );
    if (!anyDifference.length) {
      continue;
    }

    await targetDb
      .update(schema.models)
      .set(row)
      .where(eq(schema.models.id, row.id));
    console.info(`☑️ Model ${row.id} updated (${anyDifference.join(", ")})`);
    updatedCount++;
  }
  const count = rows.length;
  console.info(`✅ Models updated successfully: ${updatedCount}/${count} rows`);
}

async function copyModelTranslations(sourceDb: Client, targetDb: Client) {
  const rows = await sourceDb.select().from(schema.modelTranslations);
  if (!rows.length) {
    console.error("No rows found in source table");
    process.exit(7);
  }

  const existingRows = await targetDb
    .select({
      modelId: schema.modelTranslations.modelId,
      localeId: schema.modelTranslations.localeId,
    })
    .from(schema.modelTranslations);
  const existingModels = await targetDb
    .select({
      id: schema.models.id,
    })
    .from(schema.models);

  const missingRows = rows.filter(
    (row) =>
      !existingRows.some(
        (r) => r.modelId === row.modelId && r.localeId === row.localeId
      ) && existingModels.some((m) => m.id === row.modelId)
  );

  await targetDb.insert(schema.modelTranslations).values(missingRows);
  const count = missingRows.length;
  console.info(`✅ Model translations copied successfully: ${count} rows`);
}

main();
