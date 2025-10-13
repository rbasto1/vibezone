import { currentUser } from "@clerk/nextjs/server";
import type { DehydratedState } from "@tanstack/react-query";
import { createServerSideHelpers } from "@trpc/react-query/server";
import type { SuperJSONResult } from "superjson";
import superjson from "superjson";

import { appRouter } from "@/lib/trpc/server/server";

export async function getServerCaller() {
  const user = (await currentUser()) ?? null;

  return createServerSideHelpers({
    router: appRouter,
    ctx: {
      user,
    },
    transformer: superjson,
  });
}

export async function prefetch(
  caller: Awaited<ReturnType<typeof getServerCaller>>,
  calls: (Promise<void> | null)[]
) {
  await Promise.all(calls);
  // This function does return a SuperJSONResult, but the type is not correctly inferred
  const state = caller.dehydrate() as unknown as SuperJSONResult;
  // And then we have to deserialize it?? Doesn't make sense, but it is forcing us to do it
  return superjson.deserialize<DehydratedState>(state);
}
