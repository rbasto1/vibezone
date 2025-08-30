import "./globals.css";

import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Geist, Geist_Mono } from "next/font/google";

import { TRPCProvider } from "@/components/providers/trpc-provider";
import { ModelsProvider } from "@/components/providers/models-provider";
import { getModelsList } from "@/lib/trpc/models";
import { cn } from "@/components/ui/utils";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch models once at the root for Jotai hydration across the app
  const modelsList = await getModelsList();

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(geistSans.variable, geistMono.variable, "antialiased")}
      >
        <TRPCProvider>
          <ModelsProvider initialValue={modelsList}>
            <ThemeProvider
              attribute="class"
              storageKey="theme"
              defaultTheme="system"
              enableSystem
            >
              {children}
            </ThemeProvider>
          </ModelsProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
