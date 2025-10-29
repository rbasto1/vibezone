"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { QueryAlert } from "@/components/ui/query-alert";
import type { Model, Provider } from "@/db";
import { formatCurrency, formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc/client";
import type { FC } from "react";
import { BackLink } from "./back";
import EditableTranslations from "./EditableTranslations";

interface ModelDetailsPageClientProps {
  paramsRows: {
    sp: {
      id: string;
      label: string;
      iconUrl: string | null;
      color: string | null;
      createdAt: Date;
    };
  }[];
  id: string;
  searchParams: Record<string, string | string[] | undefined>;
  model: {
    model: Model;
    provider: Provider;
  };
}

const ModelDetailsPageClient: FC<ModelDetailsPageClientProps> = ({
  id,
  paramsRows,
  searchParams,
  model,
}) => {
  const {
    data: details,
    isLoading,
    error,
  } = trpc.models.details.useQuery(
    { modelId: id, localeId: "en" },
    { staleTime: Infinity }
  );
  const { data: adminDescriptions } = trpc.models.adminDescriptions.useQuery(
    { modelId: id },
    { staleTime: Infinity }
  );
  const m = {
    ...model.model,
    ...details,
    provider: model.provider,
  };

  const spList = paramsRows.map((r) => r.sp);
  const localeDescriptions = adminDescriptions?.translations;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <BackLink searchParams={searchParams} />
        <h1 className="text-2xl font-semibold truncate">{m?.name}</h1>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-md border p-4 space-y-2">
          <h2 className="font-semibold">General</h2>
          <table className="w-full">
            <tbody>
              <tr>
                <td>ID</td>
                <td>{m.id}</td>
              </tr>
              <tr></tr>
              <tr>
                <td>Provider</td>
                <td>{m?.provider?.name}</td>
              </tr>
              {m?.topProvider.is_moderated && (
                <tr>
                  <td>Moderated</td>
                  <td>🔴</td>
                </tr>
              )}
              <tr>
                <td>Created</td>
                <td>{formatDate(m.createdAt)}</td>
              </tr>
              {m.updatedAt > m.createdAt && (
                <tr>
                  <td>Updated</td>
                  <td>{formatDate(m.updatedAt)}</td>
                </tr>
              )}
              {m.hiddenAt && (
                <tr>
                  <td>Hidden</td>
                  <td>{formatDate(m.hiddenAt)}</td>
                </tr>
              )}
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

      <QueryAlert error={error} />
      {adminDescriptions && (
        <section className="rounded-md border p-4 space-y-3">
          <h2 className="font-semibold">Description</h2>
          <div className="rounded-sm border border-muted/40 bg-muted/20 p-3 text-sm leading-relaxed text-muted-foreground [&_a]:underline">
            <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]}>
              {adminDescriptions.description}
            </ReactMarkdown>
          </div>

          <EditableTranslations
            modelId={id}
            modelUpdatedAt={adminDescriptions.updatedAt}
            translations={localeDescriptions ?? []}
            originalDescription={adminDescriptions.description}
          />
        </section>
      )}
      {isLoading && <div>Loading translations...</div>}

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
};

function priceFormat(price: string | null | undefined) {
  return price === null || price === undefined
    ? "—"
    : Number(price) === 0
      ? "🆓"
      : formatCurrency(Number(price) * 1_000_000);
}

export default ModelDetailsPageClient;
