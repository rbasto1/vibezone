import { db } from "@/db";
import {
  models,
  modelSupportedParameters,
  providers,
  supportedParameters,
} from "@/db/schema";
import { formatCurrency, formatDate } from "@/lib/format";
import { and, eq, isNull } from "drizzle-orm";
import Link from "next/link";

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
          <table className="w-full">
            <tbody>
              <tr>
                <td>Provider</td>
                <td>{model.provider.name}</td>
              </tr>
              <tr>
                <td>Canonical Slug</td>
                <td>{m.canonicalSlug || "—"}</td>
              </tr>
              <tr>
                <td>HuggingFace</td>
                <td>{m.huggingFaceId || "—"}</td>
              </tr>
              {m.topProvider.is_moderated && (
                <tr>
                  <td>Moderated</td>
                  <td>🔴</td>
                </tr>
              )}
              <tr>
                <td>Created</td>
                <td>{formatDate(m.createdAt)}</td>
              </tr>
              <tr>
                <td>Hidden</td>
                <td>{formatDate(m.hiddenAt)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="rounded-md border p-4 space-y-2">
          <h2 className="font-semibold">Architecture</h2>
          <table className="w-full">
            <tbody>
              <tr>
                <td>Modality</td>
                <td>{m.architectureModality || "—"}</td>
              </tr>
              <tr>
                <td>Input</td>
                <td>
                  {(m.architectureInputModalities || []).join(", ") || "—"}
                </td>
              </tr>
              <tr>
                <td>Output</td>
                <td>
                  {(m.architectureOutputModalities || []).join(", ") || "—"}
                </td>
              </tr>
              <tr>
                <td>Tokenizer</td>
                <td>{m.architectureTokenizer || "—"}</td>
              </tr>
              <tr>
                <td>Instruct type</td>
                <td>{m.architectureInstructType || "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-md border p-4">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Driver</th>
                <th className="text-left">Price (per million)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Prompt</td>
                <td>{priceFormat(m.pricing.prompt)}</td>
              </tr>
              <tr>
                <td>Completion</td>
                <td>{priceFormat(m.pricing.completion)}</td>
              </tr>
              <tr>
                <td>Image</td>
                <td>{priceFormat(m.pricing.image)}</td>
              </tr>
              <tr>
                <td>Request</td>
                <td>{priceFormat(m.pricing.request)}</td>
              </tr>
              <tr>
                <td>Web Search</td>
                <td>{priceFormat(m.pricing.web_search)}</td>
              </tr>
              <tr>
                <td>Internal Reasoning</td>
                <td>{priceFormat(m.pricing.internal_reasoning)}</td>
              </tr>
              <tr>
                <td>Input Cache Read</td>
                <td>{priceFormat(m.pricing.input_cache_read)}</td>
              </tr>
              <tr>
                <td>Input Cache Write</td>
                <td>{priceFormat(m.pricing.input_cache_write)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="rounded-md border p-4">
          <h2 className="font-semibold mb-2">Limits</h2>
          <table className="w-full">
            <tbody>
              <tr>
                <td>Context Length</td>
                <td className="text-right">
                  {m.topProvider.context_length
                    ? Intl.NumberFormat().format(m.topProvider.context_length)
                    : "—"}
                </td>
              </tr>
              <tr>
                <td>Max Completion Tokens</td>
                <td className="text-right">
                  {m.topProvider.max_completion_tokens
                    ? Intl.NumberFormat().format(
                        m.topProvider.max_completion_tokens
                      )
                    : "—"}
                </td>
              </tr>
            </tbody>
          </table>
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

      <section className="rounded-md border p-4">
        <h2 className="font-semibold mb-2">Description</h2>
        <span className="text-sm text-muted-foreground">
          {model.model.description}
        </span>
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
  const href = q.toString()
    ? `/manage/models?${q.toString()}`
    : "/manage/models";
  return (
    <Link href={href} className="text-sm text-primary hover:underline">
      ← Back to models
    </Link>
  );
}

function priceFormat(price: string | null | undefined) {
  return price === null || price === undefined
    ? "—"
    : Number(price) === 0
      ? "🆓"
      : formatCurrency(Number(price) * 1_000_000);
}
