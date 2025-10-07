"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ProviderIcon } from "@/components/ui/providers/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/components/ui/utils";
import { modelMap, providerMap } from "@/lib/model-map";
import { trpc } from "@/lib/trpc/client";
import { ShieldAlertIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { capabilityOptions } from "./model-dropdown-constants";
import {
  ExperimentalTag,
  FreeTag,
  IncludedTag,
  NewTag,
  PremiumTag,
} from "./tags";

interface ModelInfoModalProps {
  modelId: string;
  onOpenChange: (open: boolean) => void;
}

export const ModelInfoModal: React.FC<ModelInfoModalProps> = ({
  modelId,
  onOpenChange,
}) => {
  const locale = useLocale();
  const t = useTranslations("ModelDropdown");

  const { data, isLoading, error } = trpc.models.details.useQuery({
    modelId,
    localeId: locale,
  });

  const description = data?.description;
  const contextLength = data?.contextLength;
  const maxCompletionTokens = data?.maxCompletionTokens;
  const createdAt = data?.createdAt.toLocaleDateString(locale);

  const modelEntry = modelMap.get(modelId);
  const providerEntry = modelEntry
    ? providerMap.get(modelEntry.providerId)
    : undefined;

  const capabilityFlags = {
    capVision: Boolean(modelEntry?.capVision),
    capPdf: Boolean(modelEntry?.capPdf),
    capReason: Boolean(modelEntry?.capReason),
    capImageGen: Boolean(modelEntry?.capImageGen),
    capTools: Boolean(modelEntry?.capTools),
  } satisfies Record<(typeof capabilityOptions)[number]["id"], boolean>;

  const tagFlags = {
    isFree: Boolean(modelEntry?.isFree),
    isIncluded: Boolean(modelEntry?.isIncluded),
    isPremium: Boolean(modelEntry?.isPremium),
    isNew: Boolean(modelEntry?.isNew),
    isExperimental: Boolean(modelEntry?.isExperimental),
  };

  const formattedContextLength =
    contextLength !== null && contextLength !== undefined
      ? `${contextLength.toLocaleString(locale)} ${t("info.tokensSuffix")}`
      : t("info.contextUnknown");

  const formattedMaxCompletion =
    maxCompletionTokens !== null && maxCompletionTokens !== undefined
      ? `${maxCompletionTokens.toLocaleString(locale)} ${t("info.tokensSuffix")}`
      : t("info.contextUnknown");

  const anyCapability = capabilityOptions.some(
    (option) => capabilityFlags[option.id]
  );

  const anyTag = Object.values(tagFlags).some(Boolean);

  const providerName =
    modelEntry?.provider.name ??
    providerEntry?.name ??
    modelId.split("/")[0] ??
    modelId;
  const showRetentionNotice =
    Boolean(providerEntry?.dataRetention) || tagFlags.isFree;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="model-info-description">
        <DialogHeader>
          <DialogTitle>
            {modelEntry && (
              <ProviderIcon
                providerId={modelEntry.providerId}
                className="mr-2"
              />
            )}
            {modelEntry?.name ?? modelId}
          </DialogTitle>
          <DialogDescription
            id="model-info-description"
            className="flex flex-col gap-1"
          >
            <span>{t("info.subtitle", { provider: providerName })}</span>
            {createdAt && (
              <span className="text-xs text-muted-foreground">
                {t("info.createdAt", { createdAt })}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error.message}
          </div>
        ) : (
          <div className="space-y-6">
            <section className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("info.descriptionHeading")}
              </div>
              {isLoading ? (
                <Skeleton className="w-full h-40" />
              ) : (
                <div className="h-40 overflow-y-auto rounded-sm border border-muted/40 bg-muted/20 p-3 text-sm leading-relaxed text-muted-foreground [&_a]:underline">
                  <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]}>
                    {description ?? t("info.descriptionFallback")}
                  </ReactMarkdown>
                </div>
              )}
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("info.contextLengthHeading")}
                </div>
                {isLoading ? (
                  <Skeleton className="w-full h-4" />
                ) : (
                  <div className="text-sm font-medium">
                    {formattedContextLength}
                  </div>
                )}
              </div>
              <div className="rounded-md border px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("info.maxCompletionHeading")}
                </div>
                {isLoading ? (
                  <Skeleton className="w-full h-4" />
                ) : (
                  <div className="text-sm font-medium">
                    {formattedMaxCompletion}
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("info.capabilitiesHeading")}
              </div>
              {isLoading ? (
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="w-24 h-4" />
                  ))}
                </div>
              ) : anyCapability ? (
                <div className="flex flex-wrap gap-2">
                  {capabilityOptions.map(({ id, Icon, color, labelKey }) => {
                    if (!capabilityFlags[id]) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium"
                      >
                        <Icon className={cn("h-3 w-3", color)} />
                        {t(labelKey)}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {t("info.noCapabilities")}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("info.tagsHeading")}
              </div>
              {anyTag ? (
                <div className="flex flex-wrap gap-2">
                  {tagFlags.isFree && <FreeTag />}
                  {tagFlags.isIncluded && <IncludedTag />}
                  {tagFlags.isPremium && <PremiumTag />}
                  {tagFlags.isNew && <NewTag />}
                  {tagFlags.isExperimental && <ExperimentalTag />}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {t("info.noTags")}
                </div>
              )}
            </section>

            {showRetentionNotice && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-100 flex items-start gap-2">
                <ShieldAlertIcon className="h-4 w-4 text-red-500" aria-hidden />
                <div>
                  {t.rich("retentionTooltip", {
                    lineBreak: () => <br />,
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
