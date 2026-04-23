import cron from "node-cron";
import { db, integrationConnections } from "@workspace/db";
import { eq } from "drizzle-orm";
import * as qb from "../connectors/quickbooks";
import * as hs from "../connectors/hubspot";
import * as stripe from "../connectors/stripe";
import * as sheets from "../connectors/sheets";
import * as gusto from "../connectors/gusto";

const SYNC_MAP = {
  quickbooks: qb.sync,
  hubspot: hs.sync,
  stripe: stripe.sync,
  sheets: sheets.sync,
  gusto: gusto.sync,
} as const;

async function runAllSyncs() {
  console.log("[cron] Starting daily sync run");
  try {
    const connections = await db.select().from(integrationConnections).where(eq(integrationConnections.status, "connected"));
    for (const conn of connections) {
      const syncFn = SYNC_MAP[conn.provider as keyof typeof SYNC_MAP];
      if (!syncFn) {
        console.warn(`[cron] No sync function for provider: ${conn.provider}`);
        continue;
      }
      try {
        console.log(`[cron] Syncing ${conn.provider} (${conn.id})`);
        const { recordsSynced } = await syncFn(conn.id);
        console.log(`[cron] ${conn.provider} synced ${recordsSynced} records`);
      } catch (err) {
        console.error(`[cron] ${conn.provider} sync failed:`, (err as Error).message);
      }
    }
  } catch (err) {
    console.error("[cron] Fatal error in daily sync:", (err as Error).message);
  }
  console.log("[cron] Daily sync run complete");
}

export function startCron() {
  cron.schedule("0 2 * * *", runAllSyncs, { timezone: "America/New_York" });
  console.log("[cron] Daily sync scheduled for 2:00 AM ET");
}
