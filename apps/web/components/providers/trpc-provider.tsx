"use client";

import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
  type DehydratedState,
} from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useMemo, useState } from "react";
import superjson from "superjson";

import { trpc } from "@/lib/trpc/client";

interface TRPCProviderProps {
  children: React.ReactNode;
  dehydratedState?: DehydratedState;
}

export const TRPCProvider = ({
  children,
  dehydratedState,
}: TRPCProviderProps) => {
  const [queryClient] = useState(() => new QueryClient());
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

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <HydrationBoundary
          state={useMemo(() => {
            if (!dehydratedState) return undefined;
            // helpers.dehydrate() returns SuperJSON-serialized data
            // Ensure we deserialize before hydrating React Query cache
            try {
              return superjson.deserialize(dehydratedState as unknown as any);
            } catch {
              return dehydratedState;
            }
          }, [dehydratedState])}
        >
          {children}
        </HydrationBoundary>
      </QueryClientProvider>
    </trpc.Provider>
  );
};
