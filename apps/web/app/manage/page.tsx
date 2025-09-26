import "server-only";

import { db } from "@/db/connection";
import { chats, models, providers, usage, user } from "@/db/schema";
import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Crown,
  Layers,
  Medal,
  MessageCircle,
  MessageSquare,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import type { NextPage } from "next";

interface KpiCard {
  icon: LucideIcon;
  title: string;
  value: string;
  subtitle: string;
}

const numberFormatter = new Intl.NumberFormat();

const formatNumber = (value: number): string => numberFormatter.format(value);

const ManagePage: NextPage<PageProps<"/manage">> = async () => {
  const lastSevenDays = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);

  const totalUsersPromise = db
    .select({ value: sql<number>`count(*)::int` })
    .from(user);
  const newUsersPromise = db
    .select({ value: sql<number>`count(*)::int` })
    .from(user)
    .where(gte(user.createdAt, lastSevenDays));
  const completionsPromise = db
    .select({ value: sql<number>`count(*)::int` })
    .from(usage)
    .where(gte(usage.createdAt, lastSevenDays));
  const loggedInCompletionsPromise = db
    .select({ value: sql<number>`count(*)::int` })
    .from(usage)
    .where(and(gte(usage.createdAt, lastSevenDays), isNotNull(usage.userId)));
  const uniqueModelsPromise = db
    .select({ value: sql<number>`count(distinct ${usage.modelId})::int` })
    .from(usage)
    .where(and(gte(usage.createdAt, lastSevenDays), isNotNull(usage.modelId)));
  const uniqueProvidersPromise = db
    .select({ value: sql<number>`count(distinct ${models.providerId})::int` })
    .from(usage)
    .innerJoin(models, eq(models.id, usage.modelId))
    .where(gte(usage.createdAt, lastSevenDays));
  const chatsModifiedPromise = db
    .select({ value: sql<number>`count(*)::int` })
    .from(chats)
    .where(gte(chats.lastMessageAt, lastSevenDays));

  const topModelCount = sql<number>`count(${usage.id})::int`.as("total");
  const topModelPromise = db
    .select({
      modelId: usage.modelId,
      modelName: models.name,
      total: topModelCount,
    })
    .from(usage)
    .innerJoin(models, eq(models.id, usage.modelId))
    .where(and(gte(usage.createdAt, lastSevenDays), isNotNull(usage.modelId)))
    .groupBy(usage.modelId, models.name)
    .orderBy(desc(topModelCount))
    .limit(1);

  const topProviderCount = sql<number>`count(${usage.id})::int`.as("total");
  const topProviderPromise = db
    .select({
      providerId: providers.id,
      providerName: providers.name,
      total: topProviderCount,
    })
    .from(usage)
    .innerJoin(models, eq(models.id, usage.modelId))
    .innerJoin(providers, eq(providers.id, models.providerId))
    .where(gte(usage.createdAt, lastSevenDays))
    .groupBy(providers.id, providers.name)
    .orderBy(desc(topProviderCount))
    .limit(1);

  const [
    totalUsersRes,
    newUsersRes,
    completionsRes,
    loggedInCompletionsRes,
    uniqueModelsRes,
    uniqueProvidersRes,
    chatsModifiedRes,
    topModelRes,
    topProviderRes,
  ] = await Promise.all([
    totalUsersPromise,
    newUsersPromise,
    completionsPromise,
    loggedInCompletionsPromise,
    uniqueModelsPromise,
    uniqueProvidersPromise,
    chatsModifiedPromise,
    topModelPromise,
    topProviderPromise,
  ]);

  const totalUsers = totalUsersRes[0]?.value ?? 0;
  const newUsers = newUsersRes[0]?.value ?? 0;
  const completions = completionsRes[0]?.value ?? 0;
  const loggedInCompletions = loggedInCompletionsRes[0]?.value ?? 0;
  const uniqueModels = uniqueModelsRes[0]?.value ?? 0;
  const uniqueProviders = uniqueProvidersRes[0]?.value ?? 0;
  const chatsModified = chatsModifiedRes[0]?.value ?? 0;

  const topModelRow = topModelRes[0];
  const topModel = topModelRow
    ? {
        name: topModelRow.modelName ?? topModelRow.modelId ?? "Unknown model",
        count: topModelRow.total ?? 0,
      }
    : null;

  const topProviderRow = topProviderRes[0];
  const topProvider = topProviderRow
    ? {
        name:
          topProviderRow.providerName ??
          topProviderRow.providerId ??
          "Unknown provider",
        count: topProviderRow.total ?? 0,
      }
    : null;

  const kpiCards: KpiCard[] = [
    {
      icon: Users,
      title: "Users",
      value: formatNumber(totalUsers),
      subtitle: "All time",
    },
    {
      icon: UserPlus,
      title: "New Users",
      value: formatNumber(newUsers),
      subtitle: "Last 7 days",
    },
    {
      icon: MessageSquare,
      title: "Completions",
      value: formatNumber(completions),
      subtitle: "Last 7 days",
    },
    {
      icon: UserCheck,
      title: "User Completions",
      value: formatNumber(loggedInCompletions),
      subtitle: "Last 7 days",
    },
    {
      icon: Layers,
      title: "Active Models",
      value: formatNumber(uniqueModels),
      subtitle: "Last 7 days",
    },
    {
      icon: Building2,
      title: "Active Providers",
      value: formatNumber(uniqueProviders),
      subtitle: "Last 7 days",
    },
    {
      icon: MessageCircle,
      title: "Active Chats",
      value: formatNumber(chatsModified),
      subtitle: "Last 7 days",
    },
    {
      icon: Medal,
      title: "Top Model",
      value: topModel?.name ?? "—",
      subtitle: topModel
        ? `${formatNumber(topModel.count)} uses in the last 7 days`
        : "No usage in the last 7 days",
    },
    {
      icon: Crown,
      title: "Top Provider",
      value: topProvider?.name ?? "—",
      subtitle: topProvider
        ? `${formatNumber(topProvider.count)} uses in the last 7 days`
        : "No usage in the last 7 days",
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Admin Overview
        </h1>
        <p className="text-muted-foreground">Key metrics across Vibezone.</p>
      </div>

      <section className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="flex flex-col justify-between rounded-lg border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
                <Icon className="h-5 w-5 text-primary" />
                <span>{card.title}</span>
              </div>
              <div className="mt-3 text-center text-3xl font-semibold tracking-tight">
                {card.value}
              </div>
              <div className="mt-1 text-center text-sm text-muted-foreground">
                {card.subtitle}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
};

export default ManagePage;
