import type { UserStats } from "@/db";

export function exportUser(user: UserStats) {
  return JSON.stringify({
    id: user.id,
    email: user.email,
    chatgpt_plus_user: false,
    birth_year: null,
    phone_number: null,
  });
}
