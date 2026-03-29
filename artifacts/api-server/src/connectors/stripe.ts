import { db, integrationConnections, metricsSnapshots, syncLogs } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export function isConfigured(): boolean {
  return true;
}

async function stripeGet(apiKey: string, path: string, params?: Record<string, string>): Promise<Record<string, unknown>> {
  const url = new URL(`https://api.stripe.com/v1/${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const resp = await fetch(url.toString(), {
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!resp.ok) throw new Error(`Stripe API error (${path}): ${await resp.text()}`);
  return resp.json() as Promise<Record<string, unknown>>;
}

export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; accountName?: string }> {
  try {
    const account = await stripeGet(apiKey, "account");
    return { valid: true, accountName: String(account["display_name"] ?? account["business_profile"]) };
  } catch {
    return { valid: false };
  }
}

export async function sync(connectionId: string): Promise<{ recordsSynced: number }> {
  const logId = `sl_${randomUUID().slice(0, 8)}`;
  await db.insert(syncLogs).values({ id: logId, integrationId: connectionId, provider: "stripe", status: "running", startedAt: new Date() });

  try {
    const [conn] = await db.select().from(integrationConnections).where(eq(integrationConnections.id, connectionId));
    if (!conn) throw new Error("Stripe connection not found");
    const apiKey = conn.accessToken;
    if (!apiKey) throw new Error("No Stripe API key stored");

    const subsData = await stripeGet(apiKey, "subscriptions", { limit: "100", status: "active", expand: ["data.customer"] });
    const subs = (subsData["data"] as Record<string, unknown>[]) ?? [];

    let totalMrr = 0;
    let customerCount = subs.length;
    let canceledThisMonth = 0;

    for (const sub of subs) {
      const items = (sub["items"] as Record<string, unknown>)?.["data"] as Record<string, unknown>[] ?? [];
      for (const item of items) {
        const plan = item["price"] as Record<string, unknown>;
        const amount = Number(plan["unit_amount"] ?? 0);
        const interval = String(plan["recurring"]
          ? (plan["recurring"] as Record<string, unknown>)["interval"]
          : "month");
        const qty = Number(item["quantity"] ?? 1);
        const monthly = interval === "year" ? (amount * qty) / 12 : amount * qty;
        totalMrr += monthly / 100;
      }
    }

    const canceledData = await stripeGet(apiKey, "subscriptions", {
      limit: "100", status: "canceled",
      "created[gte]": String(Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)),
    });
    canceledThisMonth = ((canceledData["data"] as unknown[]) ?? []).length;

    const churnRate = customerCount > 0 ? (canceledThisMonth / customerCount) * 100 : 0;
    const arr = totalMrr * 12;

    const now = new Date();
    const prefix = `stripe_${conn.id}`;
    const metrics = [
      { key: "mrr", label: "MRR", value: totalMrr, unit: "USD" },
      { key: "arr", label: "ARR", value: arr, unit: "USD" },
      { key: "customerCount", label: "Active Customers", value: customerCount, unit: "count" },
      { key: "churnRatePct", label: "Churn Rate", value: parseFloat(churnRate.toFixed(2)), unit: "%" },
    ];

    for (const m of metrics) {
      const id = `${prefix}_${m.key}`;
      await db.insert(metricsSnapshots).values({
        id, category: "stripe", metricKey: m.key, metricLabel: m.label, value: m.value, unit: m.unit,
        periodLabel: now.toISOString().slice(0, 7), source: "stripe", createdAt: now, updatedAt: now,
      }).onConflictDoUpdate({ target: metricsSnapshots.id, set: { value: m.value, updatedAt: now } });
    }

    await db.update(integrationConnections).set({ lastSyncAt: now, updatedAt: now }).where(eq(integrationConnections.id, connectionId));
    await db.update(syncLogs).set({ status: "success", recordsSynced: metrics.length, completedAt: now }).where(eq(syncLogs.id, logId));
    return { recordsSynced: metrics.length };
  } catch (err) {
    const msg = (err as Error).message;
    await db.update(syncLogs).set({ status: "error", errorMessage: msg, completedAt: new Date() }).where(eq(syncLogs.id, logId));
    throw err;
  }
}
