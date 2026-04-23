import { Router } from "express";
import { randomUUID } from "crypto";
import { db, companies, deals, financialSnapshots } from "@workspace/db";
import type {
  Company,
  Deal,
  FinancialSnapshot,
  InsertCompany,
  InsertDeal,
  InsertFinancialSnapshot,
} from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../middleware/requireAdmin";

const router = Router();

// ==================== STATUS (public read) ====================

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

router.post("/data/companies", requireAdmin, async (req, res) => {
  try {
    const body = req.body as Partial<InsertCompany> & Record<string, unknown>;
    const id = (body.id as string | undefined) || `co_${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const values: InsertCompany = {
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
      founded: body.founded != null ? Number(body.founded) : null,
      ownership: (body.ownership as string | null) ?? null,
      arr: (body.arr as string | null) ?? null,
      arrGrowthPct: body.arrGrowthPct != null ? Number(body.arrGrowthPct) : null,
      irr: (body.irr as string | null) ?? null,
      moic: (body.moic as string | null) ?? null,
      lastValDate: (body.lastValDate as string | null) ?? null,
      investors: (body.investors as string[]) || [],
      arrTrend: (body.arrTrend as { q: string; v: number }[]) || [],
      headcountTrend: (body.headcountTrend as { q: string; v: number }[]) || [],
      burnTrend: (body.burnTrend as { q: string; v: number }[]) || [],
      createdAt: now,
      updatedAt: now,
    };
    const [row] = await db.insert(companies).values(values).returning();
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/data/companies/:id", requireAdmin, async (req, res) => {
  try {
    const body = req.body as Partial<Company> & Record<string, unknown>;
    const update: Partial<InsertCompany> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if ("name" in body) update.name = body.name as string;
    if ("industry" in body) update.industry = body.industry as string;
    if ("stage" in body) update.stage = body.stage as string;
    if ("location" in body) update.location = body.location as string;
    if ("status" in body) update.status = body.status as string;
    if ("ownership" in body) update.ownership = (body.ownership as string | null) ?? null;
    if ("arr" in body) update.arr = (body.arr as string | null) ?? null;
    if ("irr" in body) update.irr = (body.irr as string | null) ?? null;
    if ("moic" in body) update.moic = (body.moic as string | null) ?? null;
    if ("lastValDate" in body) update.lastValDate = (body.lastValDate as string | null) ?? null;
    if ("logo" in body) update.logo = body.logo as string;
    if ("revenue" in body) update.revenue = Number(body.revenue) || 0;
    if ("valuation" in body) update.valuation = Number(body.valuation) || 0;
    if ("growthRate" in body) update.growthRate = Number(body.growthRate) || 0;
    if ("employees" in body) update.employees = Number(body.employees) || 0;
    if ("founded" in body) update.founded = body.founded != null ? Number(body.founded) : null;
    if ("arrGrowthPct" in body) update.arrGrowthPct = body.arrGrowthPct != null ? Number(body.arrGrowthPct) : null;
    if ("dataVerified" in body) update.dataVerified = Boolean(body.dataVerified);
    if ("ndaSigned" in body) update.ndaSigned = Boolean(body.ndaSigned);
    if ("investors" in body) update.investors = body.investors as string[];
    if ("arrTrend" in body) update.arrTrend = body.arrTrend as { q: string; v: number }[];
    if ("headcountTrend" in body) update.headcountTrend = body.headcountTrend as { q: string; v: number }[];
    if ("burnTrend" in body) update.burnTrend = body.burnTrend as { q: string; v: number }[];

    const [row] = await db
      .update(companies)
      .set(update)
      .where(eq(companies.id, String(req.params["id"])))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/data/companies/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(companies).where(eq(companies.id, String(req.params["id"])));
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

router.post("/data/deals", requireAdmin, async (req, res) => {
  try {
    const body = req.body as Partial<InsertDeal> & Record<string, unknown>;
    const id = (body.id as string | undefined) || `deal_${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const values: InsertDeal = {
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
      closingDate: (body.closingDate as string | null) ?? null,
      ndaSigned: Boolean(body.ndaSigned),
      dataRoomAccess: Boolean(body.dataRoomAccess),
      overview: (body.overview as string) || "",
      thesis: (body.thesis as string) || "",
      financials: (body.financials as InsertDeal["financials"]) ?? null,
      synergies: (body.synergies as InsertDeal["synergies"]) || [],
      contacts: (body.contacts as InsertDeal["contacts"]) || [],
      documents: (body.documents as InsertDeal["documents"]) || [],
      dueDiligenceItems: (body.dueDiligenceItems as InsertDeal["dueDiligenceItems"]) || [],
      timeline: (body.timeline as InsertDeal["timeline"]) || [],
      createdAt: now,
      updatedAt: now,
    };
    const [row] = await db.insert(deals).values(values).returning();
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/data/deals/:id", requireAdmin, async (req, res) => {
  try {
    const body = req.body as Partial<Deal> & Record<string, unknown>;
    const update: Partial<InsertDeal> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if ("companyName" in body) update.companyName = body.companyName as string;
    if ("industry" in body) update.industry = body.industry as string;
    if ("dealType" in body) update.dealType = body.dealType as string;
    if ("stage" in body) update.stage = body.stage as string;
    if ("assignedTo" in body) update.assignedTo = body.assignedTo as string;
    if ("priority" in body) update.priority = body.priority as string;
    if ("closingDate" in body) update.closingDate = (body.closingDate as string | null) ?? null;
    if ("overview" in body) update.overview = body.overview as string;
    if ("thesis" in body) update.thesis = body.thesis as string;
    if ("dealSize" in body) update.dealSize = Number(body.dealSize) || 0;
    if ("valuation" in body) update.valuation = Number(body.valuation) || 0;
    if ("targetRevenue" in body) update.targetRevenue = Number(body.targetRevenue) || 0;
    if ("ndaSigned" in body) update.ndaSigned = Boolean(body.ndaSigned);
    if ("dataRoomAccess" in body) update.dataRoomAccess = Boolean(body.dataRoomAccess);
    if ("financials" in body) update.financials = body.financials as InsertDeal["financials"];
    if ("synergies" in body) update.synergies = body.synergies as InsertDeal["synergies"];
    if ("contacts" in body) update.contacts = body.contacts as InsertDeal["contacts"];
    if ("documents" in body) update.documents = body.documents as InsertDeal["documents"];
    if ("dueDiligenceItems" in body) update.dueDiligenceItems = body.dueDiligenceItems as InsertDeal["dueDiligenceItems"];
    if ("timeline" in body) update.timeline = body.timeline as InsertDeal["timeline"];

    const [row] = await db
      .update(deals)
      .set(update)
      .where(eq(deals.id, String(req.params["id"])))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/data/deals/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(deals).where(eq(deals.id, String(req.params["id"])));
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

router.post("/data/financial-snapshots", requireAdmin, async (req, res) => {
  try {
    const body = req.body as Partial<InsertFinancialSnapshot> & Record<string, unknown>;
    const id = (body.id as string | undefined) || `fs_${randomUUID().slice(0, 8)}`;
    const rev = Number(body.revenue) || 0;
    const exp = Number(body.expenses) || 0;
    const values: InsertFinancialSnapshot = {
      id,
      period: (body.period as string) || "",
      revenue: rev,
      expenses: exp,
      ebitda: body.ebitda != null ? Number(body.ebitda) : rev - exp,
      arr: Number(body.arr) || 0,
      sortOrder: Number(body.sortOrder) || 0,
      createdAt: new Date(),
    };
    const [row] = await db.insert(financialSnapshots).values(values).returning();
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/data/financial-snapshots/:id", requireAdmin, async (req, res) => {
  try {
    const body = req.body as Partial<InsertFinancialSnapshot> & Record<string, unknown>;
    const update: Partial<InsertFinancialSnapshot> = {};

    if ("period" in body) update.period = body.period as string;
    if ("revenue" in body) update.revenue = Number(body.revenue) || 0;
    if ("expenses" in body) update.expenses = Number(body.expenses) || 0;
    if ("ebitda" in body) update.ebitda = Number(body.ebitda) || 0;
    if ("arr" in body) update.arr = Number(body.arr) || 0;
    if ("sortOrder" in body) update.sortOrder = Number(body.sortOrder) || 0;

    if (
      "revenue" in update &&
      "expenses" in update &&
      !("ebitda" in body)
    ) {
      update.ebitda = (update.revenue ?? 0) - (update.expenses ?? 0);
    }

    const [row] = await db
      .update(financialSnapshots)
      .set(update)
      .where(eq(financialSnapshots.id, String(req.params["id"])))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/data/financial-snapshots/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(financialSnapshots).where(eq(financialSnapshots.id, String(req.params["id"])));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
