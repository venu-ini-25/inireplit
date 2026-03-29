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
    headers: { "Authorization": `Bearer ${apiKey}` },
  });
  if (!resp.ok) throw new Error(`Stripe API error (${path}): ${await resp.text()}`);
  return resp.json() as Promise<Record<string, unknown>>;
}

export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; accountName?: string }> {
  try {
    const account = await stripeGet(apiKey, "account");
    const name = (account["display_name"] as string | undefined) ?? (account["business_profile"] as Record<string, string> | undefined)?.["name"] ?? "Stripe Account";
    return { valid: true, accountName: name };
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

    const subsData = await stripeGet(apiKey, "subscriptions", { limit: "100", status: "active" });
    const subs = (subsData["data"] as Record<string, unknown>[]) ?? [];

    let totalMrr = 0;
    const customerCount = subs.length;

    for (const sub of subs) {
      const items = (sub["items"] as Record<string, unknown>)?.["data"] as Record<string, unknown>[] ?? [];
      for (const item of items) {
        const plan = item["price"] as Record<string, unknown> | undefined;
        if (!plan) continue;
        const amount = Number(plan["unit_amount"] ?? 0);
        const recurring = plan["recurring"] as Record<string, unknown> | undefined;
        const interval = String(recurring?.["interval"] ?? "month");
        const qty = Number(item["quantity"] ?? 1);
        const monthly = interval === "year" ? (amount * qty) / 12 : amount * qty;
        totalMrr += monthly / 100;
      }
    }

    const canceledData = await stripeGet(apiKey, "subscriptions", {
      limit: "100",
      status: "canceled",
      "created[gte]": String(Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)),
    });
    const canceledThisMonth = ((canceledData["data"] as unknown[]) ?? []).length;
    const churnRate = customerCount > 0 ? (canceledThisMonth / customerCount) * 100 : 0;
    const arr = totalMrr * 12;

    const monthlyRevenueTrend = await buildMonthlyRevenueTrend(apiKey);

    const now = new Date();
    const prefix = `stripe_${conn.id}`;
    const metrics: { key: string; label: string; value: number; unit: string }[] = [
      { key: "mrr", label: "MRR", value: parseFloat(totalMrr.toFixed(2)), unit: "USD" },
      { key: "arr", label: "ARR", value: parseFloat(arr.toFixed(2)), unit: "USD" },
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

    let revRecords = 0;
    for (const [monthLabel, revenue] of Object.entries(monthlyRevenueTrend)) {
      const id = `${prefix}_rev_${monthLabel}`;
      await db.insert(metricsSnapshots).values({
        id, category: "stripe_revenue_trend", metricKey: "monthly_revenue", metricLabel: "Monthly Revenue",
        value: revenue, unit: "USD", periodLabel: monthLabel, source: "stripe", createdAt: now, updatedAt: now,
      }).onConflictDoUpdate({ target: metricsSnapshots.id, set: { value: revenue, updatedAt: now } });
      revRecords++;
    }

    await db.update(integrationConnections).set({ lastSyncAt: now, updatedAt: now }).where(eq(integrationConnections.id, connectionId));
    const totalRecords = metrics.length + revRecords;
    await db.update(syncLogs).set({ status: "success", recordsSynced: totalRecords, completedAt: now }).where(eq(syncLogs.id, logId));
    return { recordsSynced: totalRecords };
  } catch (err) {
    const msg = (err as Error).message;
    await db.update(syncLogs).set({ status: "error", errorMessage: msg, completedAt: new Date() }).where(eq(syncLogs.id, logId));
    throw err;
  }
}

async function buildMonthlyRevenueTrend(apiKey: string): Promise<Record<string, number>> {
  const trend: Record<string, number> = {};
  const monthsBack = 12;

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i, 1);
    d.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setMonth(end.getMonth() + 1);
    const label = d.toISOString().slice(0, 7);

    try {
      const data = await stripeGet(apiKey, "charges", {
        limit: "100",
        "created[gte]": String(Math.floor(d.getTime() / 1000)),
        "created[lt]": String(Math.floor(end.getTime() / 1000)),
      });
      const charges = (data["data"] as Record<string, unknown>[]) ?? [];
      const total = charges
        .filter((c) => c["status"] === "succeeded" && !c["refunded"])
        .reduce((sum, c) => sum + Number(c["amount"] ?? 0) / 100, 0);
      trend[label] = parseFloat(total.toFixed(2));
    } catch {
      trend[label] = 0;
    }
  }

  return trend;
}
