import type { NewUserStats } from "@/db";
import { db } from "@/db";
import { userStats } from "@/db/tables";
import { clerkClient } from "@clerk/nextjs/server";

export const syncUsers = async () => {
  const client = await clerkClient();

  let offset = 0;
  let totalCount = 0;
  do {
    const userList = await client.users.getUserList({ offset, limit: 500 });
    totalCount = userList.totalCount;

    for (const user of userList.data) {
      await db
        .insert(userStats)
        .values({
          id: user.id,
          firstName: user.firstName ?? "Unknown",
          lastName: user.lastName ?? "Unknown",
          email: user.emailAddresses[0]?.emailAddress ?? "unknown",
          imageUrl: user.imageUrl,
          createdAt: new Date(user.createdAt),
          lastActiveAt: user.lastActiveAt ? new Date(user.lastActiveAt) : null,
          lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt) : null,
        } satisfies NewUserStats)
        .onConflictDoUpdate({
          target: userStats.id,
          set: {
            firstName: user.firstName ?? "Unknown",
            lastName: user.lastName ?? "Unknown",
            email: user.emailAddresses[0]?.emailAddress ?? "unknown",
            imageUrl: user.imageUrl,
            createdAt: new Date(user.createdAt),
            lastActiveAt: user.lastActiveAt
              ? new Date(user.lastActiveAt)
              : null,
            lastSignInAt: user.lastSignInAt
              ? new Date(user.lastSignInAt)
              : null,
          },
        });
    }

    offset += userList.data.length;
  } while (offset < totalCount);
};
