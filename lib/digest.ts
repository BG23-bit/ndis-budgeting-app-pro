import { createHmac } from "crypto";

// Unsubscribe-link token for the weekly digest: HMAC of the user id keyed on
// CRON_SECRET, so links can't be forged for other accounts.
export function digestToken(userId: string): string {
  return createHmac("sha256", process.env.CRON_SECRET || "").update("digest:" + userId).digest("hex").slice(0, 32);
}
