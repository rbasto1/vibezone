import "katex/dist/katex.min.css";
import "server-only";
import "./globals.css";

import { deDE, ptBR } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { Geist, Geist_Mono } from "next/font/google";
import type { PropsWithChildren } from "react";

import { Toaster } from "@/components/providers/toast-provider";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { cn } from "@/components/ui/utils";
import { baseUrl } from "@/lib/base-url";
import { siteDescription, siteName } from "@/lib/branding";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const metadataBaseUrl = new URL(baseUrl);

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: metadataBaseUrl,
    title: {
      default: siteName,
      template: "%s — {siteName}",
    },
    description: siteDescription,
    applicationName: siteName,
    openGraph: {
      type: "website",
      url: baseUrl,
      siteName,
      title: siteName,
      description: siteDescription,
      locale: siteName === "Multipla IA" ? "pt_BR" : "en_US",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: siteName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
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
  const localePromise = getLocale();
  const messagesPromise = getMessages();
  const currentUserPromise = currentUser();
  const [locale, messages, user] = await Promise.all([
    localePromise,
    messagesPromise,
    currentUserPromise,
  ]);
  const localization = getClerkLocalization(locale);

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
              url: baseUrl,
              description: siteDescription,
              potentialAction: {
                "@type": "SearchAction",
                target: `${baseUrl}/?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        {/* Cloudflare Turnstile */}
        <script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          async
          defer
        />
      </head>
      <body
        className={cn(geistSans.variable, geistMono.variable, "antialiased")}
      >
        <TRPCProvider>
          <ThemeProvider
            attribute="class"
            storageKey="theme"
            defaultTheme="system"
            enableSystem
          >
            <ClerkProvider localization={localization}>
              <NextIntlClientProvider locale={locale} messages={messages}>
                {children}
                <Toaster />
              </NextIntlClientProvider>
            </ClerkProvider>
          </ThemeProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}

function getClerkLocalization(locale: string) {
  switch (locale) {
    case "pt-BR":
      return ptBR;
    case "de":
      return deDE;
    default:
      return undefined;
  }
}
