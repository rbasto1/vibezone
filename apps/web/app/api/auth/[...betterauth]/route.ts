export const dynamic = "force-dynamic";

import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth-server";

export const { GET, POST } = toNextJsHandler(auth);
