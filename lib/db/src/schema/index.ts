import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry").notNull().default(""),
  stage: text("stage").notNull().default("seed"),
  revenue: integer("revenue").notNull().default(0),
  valuation: integer("valuation").notNull().default(0),
  growthRate: doublePrecision("growth_rate").notNull().default(0),
  employees: integer("employees").notNull().default(0),
  location: text("location").notNull().default(""),
  status: text("status").notNull().default("active"),
  dataVerified: boolean("data_verified").notNull().default(false),
  ndaSigned: boolean("nda_signed").notNull().default(false),
  logo: text("logo").notNull().default(""),
  founded: integer("founded"),
  ownership: text("ownership"),
  arr: text("arr"),
  arrGrowthPct: doublePrecision("arr_growth_pct"),
  irr: text("irr"),
  moic: text("moic"),
  lastValDate: text("last_val_date"),
  investors: jsonb("investors").$type<string[]>().default([]),
  arrTrend: jsonb("arr_trend").$type<{ q: string; v: number }[]>().default([]),
  headcountTrend: jsonb("headcount_trend").$type<{ q: string; v: number }[]>().default([]),
  burnTrend: jsonb("burn_trend").$type<{ q: string; v: number }[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deals = pgTable("deals", {
  id: text("id").primaryKey(),
  companyName: text("company_name").notNull(),
  industry: text("industry").notNull().default(""),
  dealType: text("deal_type").notNull().default("investment"),
  stage: text("stage").notNull().default("sourcing"),
  dealSize: integer("deal_size").notNull().default(0),
  valuation: integer("valuation").notNull().default(0),
  targetRevenue: integer("target_revenue").notNull().default(0),
  assignedTo: text("assigned_to").notNull().default(""),
  priority: text("priority").notNull().default("medium"),
  closingDate: text("closing_date"),
  ndaSigned: boolean("nda_signed").notNull().default(false),
  dataRoomAccess: boolean("data_room_access").notNull().default(false),
  overview: text("overview").notNull().default(""),
  thesis: text("thesis").notNull().default(""),
  financials: jsonb("financials").$type<{ arr: number; nrr: number; growth: number; ebitda: number }>(),
  synergies: jsonb("synergies").$type<{ type: string; value: string; confidence: string }[]>().default([]),
  contacts: jsonb("contacts").$type<{ name: string; role: string; email?: string }[]>().default([]),
  documents: jsonb("documents").$type<{ name: string; type: string; date: string; size: string }[]>().default([]),
  dueDiligenceItems: jsonb("due_diligence_items").$type<Record<string, unknown>[]>().default([]),
  timeline: jsonb("timeline").$type<Record<string, unknown>[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const financialSnapshots = pgTable("financial_snapshots", {
  id: text("id").primaryKey(),
  period: text("period").notNull(),
  revenue: integer("revenue").notNull().default(0),
  expenses: integer("expenses").notNull().default(0),
  ebitda: integer("ebitda").notNull().default(0),
  arr: integer("arr").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;
export type Deal = typeof deals.$inferSelect;
export type InsertDeal = typeof deals.$inferInsert;
export type FinancialSnapshot = typeof financialSnapshots.$inferSelect;
export type InsertFinancialSnapshot = typeof financialSnapshots.$inferInsert;
