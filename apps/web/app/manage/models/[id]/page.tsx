import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  models,
  modelSupportedParameters,
  providers,
  supportedParameters,
} from "@/db/schema";
import { getServerCaller, prefetch } from "@/lib/trpc/server/ssr";
import { HydrationBoundary } from "@tanstack/react-query";
import { BackLink } from "./back";
import ModelsPageClient from "./page-client";

export default async function ModelDetailsPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: PageProps<"/manage/models/[id]">) {
  const [params, searchParams] = await Promise.all([
    paramsPromise,
    searchParamsPromise,
  ]);
  const id = decodeURIComponent(params.id);

  const [model] = await db
    .select({ model: models, provider: providers })
    .from(models)
    .innerJoin(providers, eq(models.providerId, providers.id))
    .where(and(eq(models.id, id), isNull(models.deletedAt)));

  if (!model) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-4">
          <BackLink searchParams={searchParams} />
        </div>
        <p>
          Model <code>{id}</code> not found.
        </p>
      </div>
    );
  }

  const caller = await getServerCaller();
  const paramsRows = await db
    .select({ sp: supportedParameters })
    .from(modelSupportedParameters)
    .innerJoin(
      supportedParameters,
      eq(modelSupportedParameters.supportedParameterId, supportedParameters.id)
    )
    .where(eq(modelSupportedParameters.modelId, id));
  const state = await prefetch(caller, [
    caller.models.details.prefetch({ modelId: id, localeId: "en" }),
    caller.models.adminDescriptions.prefetch({ modelId: id }),
  ]);

  return (
    <HydrationBoundary state={state}>
      <ModelsPageClient
        id={id}
        searchParams={searchParams}
        paramsRows={paramsRows}
        model={model}
      />
    </HydrationBoundary>
  );
}
