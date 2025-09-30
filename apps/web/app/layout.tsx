import "katex/dist/katex.min.css";
import "./globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";

import { SessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/providers/toast-provider";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { cn } from "@/components/ui/utils";
import { auth } from "@/lib/auth";
import { SITE_URL } from "@/lib/constants";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import type { PropsWithChildren } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const metadataBaseUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || SITE_URL);

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Layout");
  const siteName = t("siteName");
  const siteTitle = t("siteTitle");
  const siteDescription = t("siteDescription");

  return {
    metadataBase: metadataBaseUrl,
    title: {
      default: siteName,
      template: t("titleTemplate"),
    },
    description: siteDescription,
    applicationName: siteName,
    openGraph: {
      type: "website",
      url: SITE_URL,
      siteName,
      title: siteTitle,
      description: siteDescription,
      locale: t("openGraphLocale"),
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: siteTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description: siteDescription,
      images: ["/twitter-image"],
    },
    alternates: {
      canonical: "/",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: "/favicon.ico",
      shortcut: "/icon-1024.png",
      apple: "/icon-1024.png",
    },
  };
}

export default async function RootLayout({ children }: PropsWithChildren) {
  // Fetch session server-side for SSR
  const authData = await auth.api.getSession({
    headers: await headers(),
  });
  const locale = await getLocale();
  const messages = await getMessages();
  const t = await getTranslations("Layout");
  const siteName = t("siteName");
  const siteDescription = t("siteDescription");

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Structured data for better SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: siteName,
              url: SITE_URL,
              description: siteDescription,
              potentialAction: {
                "@type": "SearchAction",
                target: `${SITE_URL}/?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body
        className={cn(geistSans.variable, geistMono.variable, "antialiased")}
      >
        <TRPCProvider>
          <SessionProvider serverAuthData={authData?.user ? authData : null}>
            <NextIntlClientProvider locale={locale} messages={messages}>
              <ThemeProvider
                attribute="class"
                storageKey="theme"
                defaultTheme="system"
                enableSystem
              >
                {children}
                <Toaster />
              </ThemeProvider>
            </NextIntlClientProvider>
          </SessionProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
