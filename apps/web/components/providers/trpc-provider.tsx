"use client";

import type { DehydratedState } from "@tanstack/react-query";
import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import type { SuperJSONResult } from "superjson";
import superjson from "superjson";

import { trpc } from "@/lib/trpc/client";

interface TRPCProviderProps {
  children: React.ReactNode;
  dehydratedState?: SuperJSONResult;
}

export const TRPCProvider = ({
  children,
  dehydratedState,
}: TRPCProviderProps) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
          queries: { retry: false, staleTime: Infinity },
        },
      })
  );
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          transformer: superjson,
          url: "/api/trpc",
        }),
      ],
    })
  );

  const transformedState = dehydratedState
    ? superjson.deserialize<DehydratedState>(dehydratedState)
    : undefined;

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <HydrationBoundary state={transformedState}>
          {children}
        </HydrationBoundary>
      </QueryClientProvider>
    </trpc.Provider>
  );
};
