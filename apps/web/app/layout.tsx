import "./globals.css";

import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Geist, Geist_Mono } from "next/font/google";

import { ModelsProvider } from "@/components/providers/models-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/providers/toast-provider";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { cn } from "@/components/ui/utils";
import { auth } from "@/lib/auth";
import { getModelsList } from "@/lib/trpc/models";
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
  // Fetch models once at the root for Jotai hydration across the app
  const modelsList = await getModelsList();

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
              <ModelsProvider initialValue={modelsList}>
                <ThemeProvider
                  attribute="class"
                  storageKey="theme"
                  defaultTheme="system"
                  enableSystem
                >
                  {children}
                  <Toaster />
                </ThemeProvider>
              </ModelsProvider>
            </TRPCProvider>
          </SessionProvider>
        </Suspense>
      </body>
    </html>
  );
}
