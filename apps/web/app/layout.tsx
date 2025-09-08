import "./globals.css";

import { db } from "@/db";
import type { Model } from "@/db/schema";
import { models, user } from "@/db/schema";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Geist, Geist_Mono } from "next/font/google";

import { SessionProvider } from "@/components/providers/session-provider";
import { StoreProvider } from "@/components/providers/store-provider";
import { Toaster } from "@/components/providers/toast-provider";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { cn } from "@/components/ui/utils";
import { auth } from "@/lib/auth";
import { MAX_PANELS } from "@/lib/constants";
import { getModelsList } from "@/lib/trpc/models";
import type { PanelConfig } from "@/store/panels";
import { randomUUID } from "crypto";
import { headers } from "next/headers";
import type { PropsWithChildren } from "react";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vibezone",
  description: "Vibezone - AI Chat Application",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.vibezone.ai"
  ),
  icons: {
    icon: "/favicon.ico",
    shortcut: "/icon-1024.png",
    apple: "/icon-1024.png",
  },
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;

  // Fetch models once at the root for Jotai hydration across the app
  const modelsList = await getModelsList();

  // Attempt to load user preferences for last opened models
  const modelList =
    (await getUserPreferredModels(userId)) ?? (await getDefaultModels());

  const initialPanels = modelList.map(
    (r): PanelConfig => ({
      id: randomUUID(),
      provider: r.providerId,
      model: r.id,
    })
  );

  // Fetch session server-side for SSR
  const authData = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(geistSans.variable, geistMono.variable, "antialiased")}
      >
        <Suspense fallback={<div>Loading...</div>}>
          <SessionProvider serverAuthData={authData?.user ? authData : null}>
            <TRPCProvider>
              <StoreProvider
                modelsInitialValue={modelsList}
                panelsInitialValue={initialPanels}
              >
                <ThemeProvider
                  attribute="class"
                  storageKey="theme"
                  defaultTheme="system"
                  enableSystem
                >
                  {children}
                  <Toaster />
                </ThemeProvider>
              </StoreProvider>
            </TRPCProvider>
          </SessionProvider>
        </Suspense>
      </body>
    </html>
  );
}

async function getUserPreferredModels(userId: string | undefined) {
  if (!userId) return null;

  const pref = await db
    .select({ lastModels: user.lastModels })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  const lastModels = pref[0]?.lastModels ?? [];
  if (!lastModels?.length) return null;

  // Fetch only existing chat models, keep user order and limit to MAX_PANELS
  const candidates = await db
    .select({ id: models.id, providerId: models.providerId })
    .from(models)
    .where(
      and(
        inArray(models.id, lastModels),
        isNull(models.deletedAt),
        eq(models.isChat, true)
      )
    );
  const byId = new Map(candidates.map((m) => [m.id, m]));
  const ordered = lastModels
    .map((id) => byId.get(id))
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .slice(0, MAX_PANELS);
  if (!ordered.length) {
    return null;
  }

  return ordered;
}

let defaultModelsCache: Pick<Model, "id" | "providerId">[] | null = null;
async function getDefaultModels() {
  defaultModelsCache ??= await db
    .select({ id: models.id, providerId: models.providerId })
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
  return defaultModelsCache;
}
