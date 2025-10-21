import type { NextPage } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { providerMap } from "@/lib/model-map";
import { ArrowUpRightIcon } from "lucide-react";
import { models } from "../../../generated/models";
import { ItemList, SectionHeader } from "../text";

const ModelsPage: NextPage = async () => {
  const t = await getTranslations("Legal");
  const { free, included, premium } = models.models.reduce(
    (acc, model) => {
      if (model.isPremium) {
        acc.premium.push(model);
      } else if (model.isIncluded) {
        acc.included.push(model);
      } else {
        acc.free.push(model);
      }
      return acc;
    },
    { free: [], included: [], premium: [] } as {
      free: (typeof models.models)[number][];
      included: (typeof models.models)[number][];
      premium: (typeof models.models)[number][];
    }
  );
  free.sort(sortModels);
  included.sort(sortModels);
  premium.sort(sortModels);

  return (
    <article className="mx-auto w-full max-w-3xl px-4 sm:px-6 md:px-8 space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {t("models.title")}
        </h1>
        <p className="text-muted-foreground italic">
          {t("lastUpdated")}: {models.maxUpdatedAt.toLocaleDateString()}
        </p>
        <p>
          {t("models.totalModels", {
            count: models.models.length,
            providers: models.providers.length,
          })}
        </p>
      </header>

      <section>
        <SectionHeader num={1}>
          {t("models.freeModels", { count: free.length })}
        </SectionHeader>
        <ItemList>
          {free.map((model) => (
            <ModelItem key={model.id} model={model} />
          ))}
        </ItemList>
      </section>

      <section>
        <SectionHeader num={2}>
          {t("models.includedModels", { count: included.length })}
        </SectionHeader>
        <ItemList>
          {included.map((model) => (
            <ModelItem key={model.id} model={model} />
          ))}
        </ItemList>
      </section>

      <section>
        <SectionHeader num={3}>
          {t("models.premiumModels", { count: premium.length })}
        </SectionHeader>
        <ItemList>
          {premium.map((model) => (
            <ModelItem key={model.id} model={model} />
          ))}
        </ItemList>
      </section>
      <p>
        {t("models.backTo")}{" "}
        <Link href="/terms" className="underline">
          {t("terms.title")}
          <ArrowUpRightIcon className="inline size-3 mb-1 ml-1" />
        </Link>
      </p>
    </article>
  );
};

interface ModelItemProps {
  model: (typeof models.models)[number];
}

function ModelItem({ model }: ModelItemProps) {
  return (
    <li>
      {providerMap.get(model.providerId)?.name}: {model.name}
    </li>
  );
}

function sortModels(
  a: (typeof models.models)[number],
  b: (typeof models.models)[number]
) {
  return (
    a.providerId.localeCompare(b.providerId) || a.name.localeCompare(b.name)
  );
}

export default ModelsPage;
