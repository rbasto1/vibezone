import { auth } from "@/lib/auth";
import { appRouter } from "@/lib/trpc/server/server";
import type { DehydratedState } from "@tanstack/react-query";
import { createServerSideHelpers } from "@trpc/react-query/server";
import { headers } from "next/headers";
import type { SuperJSONResult } from "superjson";
import superjson from "superjson";

export async function getServerCaller() {
  const session = await auth.api.getSession({ headers: await headers() });

  return createServerSideHelpers({
    router: appRouter,
    ctx: { user: session?.user },
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
