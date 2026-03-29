import { Router } from "express";
import { randomUUID } from "crypto";
import { db, companies, deals, financialSnapshots } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

// ==================== STATUS ====================

router.get("/data/status", async (_req, res) => {
  try {
    const [cRows, dRows, sRows] = await Promise.all([
      db.select().from(companies),
      db.select().from(deals),
      db.select().from(financialSnapshots),
    ]);
    res.json({
      companies: cRows.length,
      deals: dRows.length,
      financialSnapshots: sRows.length,
      usingMockData: {
        companies: cRows.length === 0,
        deals: dRows.length === 0,
        financialSnapshots: sRows.length === 0,
      },
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ==================== COMPANIES ====================

router.get("/data/companies", async (_req, res) => {
  try {
    const rows = await db.select().from(companies).orderBy(asc(companies.name));
    res.json({ companies: rows, count: rows.length });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/data/companies", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const id = (body.id as string) || `co_${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const [row] = await db
      .insert(companies)
      .values({
        id,
        name: (body.name as string) || "",
        industry: (body.industry as string) || "",
        stage: (body.stage as string) || "seed",
        revenue: Number(body.revenue) || 0,
        valuation: Number(body.valuation) || 0,
        growthRate: Number(body.growthRate) || 0,
        employees: Number(body.employees) || 0,
        location: (body.location as string) || "",
        status: (body.status as string) || "active",
        dataVerified: Boolean(body.dataVerified),
        ndaSigned: Boolean(body.ndaSigned),
        logo: (body.logo as string) || "",
        founded: body.founded ? Number(body.founded) : null,
        ownership: (body.ownership as string) || null,
        arr: (body.arr as string) || null,
        arrGrowthPct: body.arrGrowthPct ? Number(body.arrGrowthPct) : null,
        irr: (body.irr as string) || null,
        moic: (body.moic as string) || null,
        lastValDate: (body.lastValDate as string) || null,
        investors: (body.investors as string[]) || [],
        arrTrend: (body.arrTrend as { q: string; v: number }[]) || [],
        headcountTrend: (body.headcountTrend as { q: string; v: number }[]) || [],
        burnTrend: (body.burnTrend as { q: string; v: number }[]) || [],
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/data/companies/:id", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const fields = [
      "name", "industry", "stage", "location", "status", "ownership",
      "arr", "irr", "moic", "lastValDate", "logo",
    ] as const;
    for (const f of fields) {
      if (f in body) updates[f] = body[f];
    }
    const numFields = ["revenue", "valuation", "growthRate", "employees", "founded", "arrGrowthPct"] as const;
    for (const f of numFields) {
      if (f in body) updates[f] = body[f] != null ? Number(body[f]) : null;
    }
    const boolFields = ["dataVerified", "ndaSigned"] as const;
    for (const f of boolFields) {
      if (f in body) updates[f] = Boolean(body[f]);
    }
    const jsonFields = ["investors", "arrTrend", "headcountTrend", "burnTrend"] as const;
    for (const f of jsonFields) {
      if (f in body) updates[f] = body[f];
    }

    const [row] = await db
      .update(companies)
      .set(updates as Parameters<typeof db.update>[0] extends never ? never : Record<string, unknown>)
      .where(eq(companies.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/data/companies/:id", async (req, res) => {
  try {
    await db.delete(companies).where(eq(companies.id, req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ==================== DEALS ====================

router.get("/data/deals", async (_req, res) => {
  try {
    const rows = await db.select().from(deals).orderBy(asc(deals.createdAt));
    res.json({ deals: rows, count: rows.length });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/data/deals", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const id = (body.id as string) || `deal_${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const [row] = await db
      .insert(deals)
      .values({
        id,
        companyName: (body.companyName as string) || "",
        industry: (body.industry as string) || "",
        dealType: (body.dealType as string) || "investment",
        stage: (body.stage as string) || "sourcing",
        dealSize: Number(body.dealSize) || 0,
        valuation: Number(body.valuation) || 0,
        targetRevenue: Number(body.targetRevenue) || 0,
        assignedTo: (body.assignedTo as string) || "",
        priority: (body.priority as string) || "medium",
        closingDate: (body.closingDate as string) || null,
        ndaSigned: Boolean(body.ndaSigned),
        dataRoomAccess: Boolean(body.dataRoomAccess),
        overview: (body.overview as string) || "",
        thesis: (body.thesis as string) || "",
        financials: (body.financials as { arr: number; nrr: number; growth: number; ebitda: number }) || null,
        synergies: (body.synergies as { type: string; value: string; confidence: string }[]) || [],
        contacts: (body.contacts as { name: string; role: string; email?: string }[]) || [],
        documents: (body.documents as { name: string; type: string; date: string; size: string }[]) || [],
        dueDiligenceItems: (body.dueDiligenceItems as Record<string, unknown>[]) || [],
        timeline: (body.timeline as Record<string, unknown>[]) || [],
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/data/deals/:id", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const strFields = [
      "companyName", "industry", "dealType", "stage", "assignedTo",
      "priority", "closingDate", "overview", "thesis",
    ] as const;
    for (const f of strFields) {
      if (f in body) updates[f] = body[f];
    }
    const numFields = ["dealSize", "valuation", "targetRevenue"] as const;
    for (const f of numFields) {
      if (f in body) updates[f] = Number(body[f]) || 0;
    }
    const boolFields = ["ndaSigned", "dataRoomAccess"] as const;
    for (const f of boolFields) {
      if (f in body) updates[f] = Boolean(body[f]);
    }
    const jsonFields = ["financials", "synergies", "contacts", "documents", "dueDiligenceItems", "timeline"] as const;
    for (const f of jsonFields) {
      if (f in body) updates[f] = body[f];
    }

    const [row] = await db
      .update(deals)
      .set(updates as Parameters<typeof db.update>[0] extends never ? never : Record<string, unknown>)
      .where(eq(deals.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/data/deals/:id", async (req, res) => {
  try {
    await db.delete(deals).where(eq(deals.id, req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ==================== FINANCIAL SNAPSHOTS ====================

router.get("/data/financial-snapshots", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(financialSnapshots)
      .orderBy(asc(financialSnapshots.sortOrder));
    res.json({ snapshots: rows, count: rows.length });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/data/financial-snapshots", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const id = (body.id as string) || `fs_${randomUUID().slice(0, 8)}`;
    const rev = Number(body.revenue) || 0;
    const exp = Number(body.expenses) || 0;
    const [row] = await db
      .insert(financialSnapshots)
      .values({
        id,
        period: (body.period as string) || "",
        revenue: rev,
        expenses: exp,
        ebitda: body.ebitda != null ? Number(body.ebitda) : rev - exp,
        arr: Number(body.arr) || 0,
        sortOrder: Number(body.sortOrder) || 0,
        createdAt: new Date(),
      })
      .returning();
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/data/financial-snapshots/:id", async (req, res) => {
  try {
    await db.delete(financialSnapshots).where(eq(financialSnapshots.id, req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
