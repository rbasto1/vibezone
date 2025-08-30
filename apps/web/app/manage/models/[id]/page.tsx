import { db } from "@/db";
import {
  models,
  modelSupportedParameters,
  providers,
  supportedParameters,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

function formatDate(value?: Date | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

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
    .where(eq(models.id, id));

  if (!model) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-4">
          <BackLink searchParams={searchParams} />
        </div>
        <p>Model not found.</p>
      </div>
    );
  }

  const paramsRows = await db
    .select({ sp: supportedParameters })
    .from(modelSupportedParameters)
    .innerJoin(
      supportedParameters,
      eq(modelSupportedParameters.supportedParameterId, supportedParameters.id)
    )
    .where(eq(modelSupportedParameters.modelId, id));

  const spList = paramsRows.map((r) => r.sp);
  const m = model.model;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <BackLink searchParams={searchParams} />
        <h1 className="text-2xl font-semibold truncate">{m.name}</h1>
      </div>

      <section className="space-y-1">
        <div className="text-sm text-muted-foreground">ID</div>
        <div className="font-mono text-sm break-all">{m.id}</div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-md border p-4 space-y-2">
          <h2 className="font-semibold">General</h2>
          <div className="text-sm">Provider: {model.provider.name}</div>
          <div className="text-sm">
            Canonical Slug: {m.canonicalSlug || "—"}
          </div>
          <div className="text-sm">HuggingFace: {m.huggingFaceId || "—"}</div>
          <div className="text-sm">Created: {formatDate(m.createdAt)}</div>
          <div className="text-sm">Deleted: {formatDate(m.deletedAt)}</div>
        </div>
        <div className="rounded-md border p-4 space-y-2">
          <h2 className="font-semibold">Architecture</h2>
          <div className="text-sm">
            Modality: {m.architectureModality || "—"}
          </div>
          <div className="text-sm">
            Input: {(m.architectureInputModalities || []).join(", ") || "—"}
          </div>
          <div className="text-sm">
            Output: {(m.architectureOutputModalities || []).join(", ") || "—"}
          </div>
          <div className="text-sm">
            Tokenizer: {m.architectureTokenizer || "—"}
          </div>
          <div className="text-sm">
            Instruct type: {m.architectureInstructType || "—"}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-md border p-4">
          <h2 className="font-semibold mb-2">Pricing</h2>
          <pre className="rounded bg-muted/40 p-2 text-xs overflow-auto">
            {JSON.stringify(m.pricing, null, 2)}
          </pre>
        </div>
        <div className="rounded-md border p-4">
          <h2 className="font-semibold mb-2">Top Provider</h2>
          <pre className="rounded bg-muted/40 p-2 text-xs overflow-auto">
            {JSON.stringify(m.topProvider, null, 2)}
          </pre>
        </div>
      </section>

      <section className="rounded-md border p-4">
        <h2 className="font-semibold mb-2">Per-request Limits</h2>
        <pre className="rounded bg-muted/40 p-2 text-xs overflow-auto">
          {JSON.stringify(m.perRequestLimits, null, 2)}
        </pre>
      </section>

      <section className="rounded-md border p-4">
        <h2 className="font-semibold mb-2">Supported Parameters</h2>
        {spList.length === 0 ? (
          <div className="text-sm text-muted-foreground">None</div>
        ) : (
          <ul className="text-sm grid grid-cols-2 gap-2">
            {spList.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span className="font-mono text-xs">{p.id}</span>
                <span className="text-muted-foreground">{p.label}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function BackLink({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const q = new URLSearchParams();
  const provider = searchParams.provider;
  const txt = searchParams.q;
  const sort = searchParams.sort;
  if (typeof provider === "string") q.set("provider", provider);
  if (typeof txt === "string") q.set("q", txt);
  if (typeof sort === "string") q.set("sort", sort);
  const href = q.toString() ? `/manage?${q.toString()}` : "/manage";
  return (
    <Link href={href} className="text-sm text-primary hover:underline">
      ← Back to models
    </Link>
  );
}
