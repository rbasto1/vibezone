import type { User } from "@clerk/nextjs/server";
import { z } from "zod";

const privateMetadataSchema = z.object({
  isAdmin: z.boolean().optional(),
});

export const isUserAdmin = (user: User | null) => {
  const privateMetadata = privateMetadataSchema.safeParse(
    user?.privateMetadata
  ).data;
  return !!privateMetadata?.isAdmin;
};
