/**
 * iNi DB Seed Script
 * Populates all tables with production-quality data.
 * Run: node scripts/seed-db.mjs
 */

import pg from "pg";
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
console.log("Connected to DB");

// ─── Helpers ────────────────────────────────────────────────────────────────
async function upsert(table, row, conflictCol = "id") {
  const keys = Object.keys(row);
  const cols = keys.map((k) => `"${toSnake(k)}"`).join(", ");
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  const updates = keys
    .filter((k) => k !== conflictCol)
    .map((k) => `"${toSnake(k)}" = EXCLUDED."${toSnake(k)}"`)
    .join(", ");
  const values = keys.map((k) => {
    const v = row[k];
    return typeof v === "object" && v !== null ? JSON.stringify(v) : v;
  });
  const sql = `
    INSERT INTO "${table}" (${cols})
    VALUES (${placeholders})
    ON CONFLICT ("${toSnake(conflictCol)}") DO UPDATE SET ${updates}
  `;
  await client.query(sql, values);
}

function toSnake(str) {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase();
}

function makeTrend(start, end) {
  const quarters = ["Q1 '23","Q2 '23","Q3 '23","Q4 '23","Q1 '24","Q2 '24","Q3 '24","Q4 '24"];
  return quarters.map((q, i) => ({
    q,
    v: parseFloat((start + ((end - start) * i) / (quarters.length - 1)).toFixed(2)),
  }));
}

// ─── 1. Financial Snapshots (12 months) ─────────────────────────────────────
console.log("Seeding financial_snapshots...");
const months = [
  { period: "Jan 2024", revenue: 2820000, expenses: 1640000, ebitda: 1180000, arr: 3100000, sortOrder: 1 },
  { period: "Feb 2024", revenue: 2940000, expenses: 1680000, ebitda: 1260000, arr: 3280000, sortOrder: 2 },
  { period: "Mar 2024", revenue: 3120000, expenses: 1720000, ebitda: 1400000, arr: 3450000, sortOrder: 3 },
  { period: "Apr 2024", revenue: 3280000, expenses: 1760000, ebitda: 1520000, arr: 3680000, sortOrder: 4 },
  { period: "May 2024", revenue: 3410000, expenses: 1800000, ebitda: 1610000, arr: 3890000, sortOrder: 5 },
  { period: "Jun 2024", revenue: 3590000, expenses: 1840000, ebitda: 1750000, arr: 4120000, sortOrder: 6 },
  { period: "Jul 2024", revenue: 3720000, expenses: 1880000, ebitda: 1840000, arr: 4310000, sortOrder: 7 },
  { period: "Aug 2024", revenue: 3890000, expenses: 1900000, ebitda: 1990000, arr: 4560000, sortOrder: 8 },
  { period: "Sep 2024", revenue: 4050000, expenses: 1920000, ebitda: 2130000, arr: 4780000, sortOrder: 9 },
  { period: "Oct 2024", revenue: 4180000, expenses: 1910000, ebitda: 2270000, arr: 5010000, sortOrder: 10 },
  { period: "Nov 2024", revenue: 4290000, expenses: 1930000, ebitda: 2360000, arr: 5240000, sortOrder: 11 },
  { period: "Dec 2024", revenue: 4420000, expenses: 1950000, ebitda: 2470000, arr: 5480000, sortOrder: 12 },
];
for (const [i, m] of months.entries()) {
  await upsert("financial_snapshots", { id: `snap_${String(i + 1).padStart(3, "0")}`, ...m });
}
console.log(`  ✓ ${months.length} snapshots`);

// ─── 2. Metrics Snapshots ────────────────────────────────────────────────────
console.log("Seeding metrics_snapshots...");
const metrics = [
  // operations
  { id: "ms_ops_001", category: "operations", metricKey: "totalHeadcount",    metricLabel: "Total Headcount",       value: 89,   unit: "people",   periodLabel: "Dec 2024", source: "gusto" },
  { id: "ms_ops_002", category: "operations", metricKey: "monthlyBurnM",       metricLabel: "Monthly Burn",          value: 3.5,  unit: "M",        periodLabel: "Dec 2024", source: "quickbooks" },
  { id: "ms_ops_003", category: "operations", metricKey: "cashRunwayMonths",   metricLabel: "Cash Runway",           value: 14,   unit: "months",   periodLabel: "Dec 2024", source: "quickbooks" },
  { id: "ms_ops_004", category: "operations", metricKey: "grossMarginPct",     metricLabel: "Gross Margin",          value: 81.4, unit: "%",        periodLabel: "Dec 2024", source: "quickbooks" },

  // product
  { id: "ms_prd_001", category: "product", metricKey: "dauCount",      metricLabel: "Daily Active Users", value: 9800,  unit: "users",   periodLabel: "Dec 2024", source: "manual" },
  { id: "ms_prd_002", category: "product", metricKey: "mauCount",      metricLabel: "Monthly Active Users",value: 33400, unit: "users",   periodLabel: "Dec 2024", source: "manual" },
  { id: "ms_prd_003", category: "product", metricKey: "dauMauRatio",   metricLabel: "DAU/MAU Ratio",      value: 29.3,  unit: "%",       periodLabel: "Dec 2024", source: "manual" },
  { id: "ms_prd_004", category: "product", metricKey: "churnRatePct",  metricLabel: "Churn Rate",         value: 2.1,   unit: "%",       periodLabel: "Dec 2024", source: "stripe" },

  // marketing
  { id: "ms_mkt_001", category: "marketing", metricKey: "totalMQLs",           metricLabel: "Total MQLs",           value: 1600, unit: "leads",   periodLabel: "Dec 2024", source: "hubspot" },
  { id: "ms_mkt_002", category: "marketing", metricKey: "blendedCAC",           metricLabel: "Blended CAC",          value: 740,  unit: "$",       periodLabel: "Dec 2024", source: "hubspot" },
  { id: "ms_mkt_003", category: "marketing", metricKey: "marketingPipelineM",   metricLabel: "Marketing Pipeline",   value: 3.1,  unit: "M",       periodLabel: "Dec 2024", source: "hubspot" },

  // sales
  { id: "ms_sal_001", category: "sales", metricKey: "totalBookingsK",      metricLabel: "Total Bookings",      value: 10100, unit: "K",  periodLabel: "Dec 2024", source: "hubspot" },
  { id: "ms_sal_002", category: "sales", metricKey: "avgDealSizeK",         metricLabel: "Avg Deal Size",       value: 48,    unit: "K",  periodLabel: "Dec 2024", source: "hubspot" },
  { id: "ms_sal_003", category: "sales", metricKey: "winRatePct",           metricLabel: "Win Rate",            value: 28.4,  unit: "%",  periodLabel: "Dec 2024", source: "hubspot" },
  { id: "ms_sal_004", category: "sales", metricKey: "quotaAttainmentPct",   metricLabel: "Quota Attainment",    value: 108,   unit: "%",  periodLabel: "Dec 2024", source: "hubspot" },

  // people
  { id: "ms_ppl_001", category: "people", metricKey: "totalHeadcount",    metricLabel: "Total Headcount",    value: 89,   unit: "people",   periodLabel: "Dec 2024", source: "gusto" },
  { id: "ms_ppl_002", category: "people", metricKey: "openRoles",         metricLabel: "Open Roles",         value: 14,   unit: "roles",    periodLabel: "Dec 2024", source: "gusto" },
  { id: "ms_ppl_003", category: "people", metricKey: "attritionRatePct",  metricLabel: "Attrition Rate",     value: 10.8, unit: "%",        periodLabel: "Dec 2024", source: "gusto" },
  { id: "ms_ppl_004", category: "people", metricKey: "avgTenureMonths",   metricLabel: "Avg Tenure",         value: 22.4, unit: "months",   periodLabel: "Dec 2024", source: "gusto" },
  { id: "ms_ppl_005", category: "people", metricKey: "hc_engineering",    metricLabel: "Eng HC",             value: 34,   unit: "people",   periodLabel: "Dec 2024", source: "gusto" },
  { id: "ms_ppl_006", category: "people", metricKey: "hc_sales",          metricLabel: "Sales HC",           value: 18,   unit: "people",   periodLabel: "Dec 2024", source: "gusto" },
  { id: "ms_ppl_007", category: "people", metricKey: "hc_marketing",      metricLabel: "Marketing HC",       value: 10,   unit: "people",   periodLabel: "Dec 2024", source: "gusto" },
  { id: "ms_ppl_008", category: "people", metricKey: "hc_ga",             metricLabel: "G&A HC",             value: 12,   unit: "people",   periodLabel: "Dec 2024", source: "gusto" },
  { id: "ms_ppl_009", category: "people", metricKey: "hc_product",        metricLabel: "Product HC",         value: 11,   unit: "people",   periodLabel: "Dec 2024", source: "gusto" },
  { id: "ms_ppl_010", category: "people", metricKey: "hc_support",        metricLabel: "Support HC",         value: 4,    unit: "people",   periodLabel: "Dec 2024", source: "gusto" },
  { id: "ms_ppl_011", category: "people", metricKey: "attrition_engineering", metricLabel: "Eng Attrition",  value: 8.2,  unit: "%",        periodLabel: "Dec 2024", source: "gusto" },
  { id: "ms_ppl_012", category: "people", metricKey: "attrition_sales",       metricLabel: "Sales Attrition",value: 14.6, unit: "%",        periodLabel: "Dec 2024", source: "gusto" },
  { id: "ms_ppl_013", category: "people", metricKey: "attrition_marketing",   metricLabel: "Mktg Attrition", value: 10.1, unit: "%",        periodLabel: "Dec 2024", source: "gusto" },
  { id: "ms_ppl_014", category: "people", metricKey: "attrition_ga",          metricLabel: "G&A Attrition",  value: 6.4,  unit: "%",        periodLabel: "Dec 2024", source: "gusto" },
  { id: "ms_ppl_015", category: "people", metricKey: "attrition_product",     metricLabel: "Prod Attrition", value: 7.8,  unit: "%",        periodLabel: "Dec 2024", source: "gusto" },
  { id: "ms_ppl_016", category: "people", metricKey: "attrition_support",     metricLabel: "Supp Attrition", value: 16.2, unit: "%",        periodLabel: "Dec 2024", source: "gusto" },

  // cashflow
  { id: "ms_cf_001", category: "cashflow", metricKey: "totalInflowsM",  metricLabel: "Total Inflows",   value: 56.8,  unit: "M",   periodLabel: "Dec 2024", source: "quickbooks" },
  { id: "ms_cf_002", category: "cashflow", metricKey: "totalOutflowsM", metricLabel: "Total Outflows",  value: 44.1,  unit: "M",   periodLabel: "Dec 2024", source: "quickbooks" },
  { id: "ms_cf_003", category: "cashflow", metricKey: "netCashFlowM",   metricLabel: "Net Cash Flow",   value: 12.7,  unit: "M",   periodLabel: "Dec 2024", source: "quickbooks" },
  { id: "ms_cf_004", category: "cashflow", metricKey: "cashOnHandM",    metricLabel: "Cash on Hand",    value: 18.4,  unit: "M",   periodLabel: "Dec 2024", source: "quickbooks" },

  // spending
  { id: "ms_spd_001", category: "spending", metricKey: "payroll",       metricLabel: "Payroll & Benefits",     value: 18400, unit: "$", periodLabel: "Dec 2024", source: "gusto" },
  { id: "ms_spd_002", category: "spending", metricKey: "software",      metricLabel: "Software & SaaS",        value: 5200,  unit: "$", periodLabel: "Dec 2024", source: "quickbooks" },
  { id: "ms_spd_003", category: "spending", metricKey: "marketing",     metricLabel: "Marketing & Ads",        value: 4100,  unit: "$", periodLabel: "Dec 2024", source: "quickbooks" },
  { id: "ms_spd_004", category: "spending", metricKey: "office",        metricLabel: "Office & Facilities",    value: 2800,  unit: "$", periodLabel: "Dec 2024", source: "quickbooks" },
  { id: "ms_spd_005", category: "spending", metricKey: "travel",        metricLabel: "Travel & Entertainment", value: 1600,  unit: "$", periodLabel: "Dec 2024", source: "quickbooks" },
  { id: "ms_spd_006", category: "spending", metricKey: "professional",  metricLabel: "Professional Services",  value: 2100,  unit: "$", periodLabel: "Dec 2024", source: "quickbooks" },
  { id: "ms_spd_007", category: "spending", metricKey: "other",         metricLabel: "Other",                  value: 1800,  unit: "$", periodLabel: "Dec 2024", source: "quickbooks" },
];
for (const m of metrics) {
  await upsert("metrics_snapshots", m);
}
console.log(`  ✓ ${metrics.length} metric rows`);

// ─── 3. Companies ─────────────────────────────────────────────────────────────
console.log("Seeding companies...");
const companies = [
  {
    id: "co_001", name: "NovaPay", industry: "Fintech", stage: "series_b",
    revenue: 8400000, valuation: 62000000, growthRate: 94, employees: 63, location: "San Francisco, CA",
    status: "active", dataVerified: true, ndaSigned: true, logo: "",
    founded: 2019, ownership: "18.5%", arr: "$8.4M", arrGrowthPct: 94,
    irr: "31.2%", moic: "2.4x", lastValDate: "Oct 2024",
    investors: ["Sequoia Capital", "Andreessen Horowitz", "iNi Capital"],
    arrTrend: makeTrend(1.2, 8.4),
    headcountTrend: ["Q1 '23","Q2 '23","Q3 '23","Q4 '23","Q1 '24","Q2 '24","Q3 '24","Q4 '24"].map((q, i) => ({ q, v: 30 + i * 9 })),
    burnTrend: [
      { q: "Q1 '23", v: 1.4 }, { q: "Q2 '23", v: 1.6 }, { q: "Q3 '23", v: 1.8 },
      { q: "Q4 '23", v: 2.0 }, { q: "Q1 '24", v: 1.9 }, { q: "Q2 '24", v: 1.7 },
      { q: "Q3 '24", v: 1.4 }, { q: "Q4 '24", v: 1.1 },
    ],
  },
  {
    id: "co_002", name: "DataStream AI", industry: "AI/ML", stage: "series_a",
    revenue: 3200000, valuation: 28000000, growthRate: 72, employees: 41, location: "New York, NY",
    status: "active", dataVerified: true, ndaSigned: true, logo: "",
    founded: 2021, ownership: "22.0%", arr: "$3.2M", arrGrowthPct: 72,
    irr: "24.8%", moic: "1.9x", lastValDate: "Sep 2024",
    investors: ["Bessemer Ventures", "iNi Capital", "500 Startups"],
    arrTrend: makeTrend(0.5, 3.2),
    headcountTrend: ["Q1 '23","Q2 '23","Q3 '23","Q4 '23","Q1 '24","Q2 '24","Q3 '24","Q4 '24"].map((q, i) => ({ q, v: 14 + i * 4 })),
    burnTrend: ["Q1 '23","Q2 '23","Q3 '23","Q4 '23","Q1 '24","Q2 '24","Q3 '24","Q4 '24"].map((q, i) => ({ q, v: parseFloat((0.5 + i * 0.1).toFixed(2)) })),
  },
  {
    id: "co_003", name: "GreenRoute Logistics", industry: "Climate Tech", stage: "series_a",
    revenue: 5100000, valuation: 38000000, growthRate: 31, employees: 78, location: "Austin, TX",
    status: "active", dataVerified: false, ndaSigned: true, logo: "",
    founded: 2020, ownership: "15.2%", arr: "$5.1M", arrGrowthPct: 31,
    irr: "18.4%", moic: "1.6x", lastValDate: "Jul 2024",
    investors: ["General Catalyst", "iNi Capital"],
    arrTrend: makeTrend(1.8, 5.1),
    headcountTrend: ["Q1 '23","Q2 '23","Q3 '23","Q4 '23","Q1 '24","Q2 '24","Q3 '24","Q4 '24"].map((q, i) => ({ q, v: 30 + i * 6 })),
    burnTrend: ["Q1 '23","Q2 '23","Q3 '23","Q4 '23","Q1 '24","Q2 '24","Q3 '24","Q4 '24"].map((q, i) => ({ q, v: parseFloat((0.8 + i * 0.08).toFixed(2)) })),
  },
  {
    id: "co_004", name: "RetailEdge", industry: "SaaS", stage: "series_b",
    revenue: 12800000, valuation: 94000000, growthRate: 142, employees: 112, location: "Chicago, IL",
    status: "active", dataVerified: true, ndaSigned: true, logo: "",
    founded: 2020, ownership: "22.3%", arr: "$12.8M", arrGrowthPct: 142,
    irr: "42.1%", moic: "3.1x", lastValDate: "Nov 2024",
    investors: ["Tiger Global", "iNi Capital", "Insight Partners"],
    arrTrend: makeTrend(0.8, 12.8),
    headcountTrend: ["Q1 '23","Q2 '23","Q3 '23","Q4 '23","Q1 '24","Q2 '24","Q3 '24","Q4 '24"].map((q, i) => ({ q, v: 30 + i * 12 })),
    burnTrend: ["Q1 '23","Q2 '23","Q3 '23","Q4 '23","Q1 '24","Q2 '24","Q3 '24","Q4 '24"].map((q, i) => ({ q, v: parseFloat((1.2 + i * 0.15).toFixed(2)) })),
  },
  {
    id: "co_005", name: "HealthVault", industry: "HealthTech", stage: "seed",
    revenue: 1100000, valuation: 9500000, growthRate: 48, employees: 19, location: "Boston, MA",
    status: "active", dataVerified: false, ndaSigned: false, logo: "",
    founded: 2022, ownership: "12.8%", arr: "$1.1M", arrGrowthPct: 48,
    irr: "14.2%", moic: "1.3x", lastValDate: "Aug 2024",
    investors: ["Y Combinator", "iNi Capital"],
    arrTrend: makeTrend(0.2, 1.1),
    headcountTrend: ["Q1 '23","Q2 '23","Q3 '23","Q4 '23","Q1 '24","Q2 '24","Q3 '24","Q4 '24"].map((q, i) => ({ q, v: 6 + i * 2 })),
    burnTrend: ["Q1 '23","Q2 '23","Q3 '23","Q4 '23","Q1 '24","Q2 '24","Q3 '24","Q4 '24"].map((q, i) => ({ q, v: parseFloat((0.2 + i * 0.02).toFixed(2)) })),
  },
  {
    id: "co_006", name: "EduCore", industry: "EdTech", stage: "series_a",
    revenue: 4200000, valuation: 31000000, growthRate: 68, employees: 56, location: "Seattle, WA",
    status: "active", dataVerified: true, ndaSigned: true, logo: "",
    founded: 2021, ownership: "19.4%", arr: "$4.2M", arrGrowthPct: 68,
    irr: "22.6%", moic: "2.1x", lastValDate: "Oct 2024",
    investors: ["Owl Ventures", "iNi Capital", "Learn Capital"],
    arrTrend: makeTrend(0.6, 4.2),
    headcountTrend: ["Q1 '23","Q2 '23","Q3 '23","Q4 '23","Q1 '24","Q2 '24","Q3 '24","Q4 '24"].map((q, i) => ({ q, v: 16 + i * 6 })),
    burnTrend: ["Q1 '23","Q2 '23","Q3 '23","Q4 '23","Q1 '24","Q2 '24","Q3 '24","Q4 '24"].map((q, i) => ({ q, v: parseFloat((0.6 + i * 0.06).toFixed(2)) })),
  },
  {
    id: "co_007", name: "CyberShield", industry: "Cybersecurity", stage: "series_a",
    revenue: 6800000, valuation: 52000000, growthRate: 89, employees: 84, location: "Washington, DC",
    status: "active", dataVerified: true, ndaSigned: true, logo: "",
    founded: 2020, ownership: "16.7%", arr: "$6.8M", arrGrowthPct: 89,
    irr: "28.4%", moic: "2.2x", lastValDate: "Sep 2024",
    investors: ["CRV", "iNi Capital", "Founders Fund"],
    arrTrend: makeTrend(1.0, 6.8),
    headcountTrend: ["Q1 '23","Q2 '23","Q3 '23","Q4 '23","Q1 '24","Q2 '24","Q3 '24","Q4 '24"].map((q, i) => ({ q, v: 22 + i * 9 })),
    burnTrend: ["Q1 '23","Q2 '23","Q3 '23","Q4 '23","Q1 '24","Q2 '24","Q3 '24","Q4 '24"].map((q, i) => ({ q, v: parseFloat((0.9 + i * 0.11).toFixed(2)) })),
  },
  {
    id: "co_008", name: "SupplyX", industry: "Supply Chain", stage: "growth",
    revenue: 18500000, valuation: 140000000, growthRate: 112, employees: 168, location: "Miami, FL",
    status: "exited", dataVerified: true, ndaSigned: true, logo: "",
    founded: 2018, ownership: "8.2%", arr: "$18.5M", arrGrowthPct: 112,
    irr: "38.7%", moic: "4.2x", lastValDate: "Dec 2024",
    investors: ["Softbank", "iNi Capital", "Coatue"],
    arrTrend: makeTrend(2.1, 18.5),
    headcountTrend: ["Q1 '23","Q2 '23","Q3 '23","Q4 '23","Q1 '24","Q2 '24","Q3 '24","Q4 '24"].map((q, i) => ({ q, v: 68 + i * 14 })),
    burnTrend: ["Q1 '23","Q2 '23","Q3 '23","Q4 '23","Q1 '24","Q2 '24","Q3 '24","Q4 '24"].map((q, i) => ({ q, v: parseFloat((2.8 + i * 0.2).toFixed(2)) })),
  },
];
for (const c of companies) {
  await upsert("companies", c);
}
console.log(`  ✓ ${companies.length} companies`);

// ─── 4. Deals ─────────────────────────────────────────────────────────────────
console.log("Seeding deals...");
const deals = [
  {
    id: "deal_001", companyName: "Meridian Analytics", industry: "SaaS", dealType: "investment",
    stage: "due_diligence", dealSize: 8000000, valuation: 55000000, targetRevenue: 4200000,
    assignedTo: "Venu Vegi", priority: "high", closingDate: "2025-03-31",
    ndaSigned: true, dataRoomAccess: true,
    overview: "Meridian Analytics is a B2B SaaS platform delivering real-time revenue intelligence and pipeline analytics for mid-market sales teams.",
    thesis: "Strong product-market fit in underserved mid-market segment with 140% NRR and clear path to $20M ARR by 2026.",
    financials: { arr: 4200000, nrr: 140, growth: 98, ebitda: -1200000 },
    synergies: [
      { type: "Portfolio", value: "Cross-sell to NovaPay & RetailEdge", confidence: "High" },
      { type: "Operational", value: "Shared GTM infrastructure", confidence: "Medium" },
    ],
    contacts: [
      { name: "Alex Rivera", role: "CEO", email: "alex@meridiananalytics.io" },
      { name: "Jordan Lee", role: "CFO", email: "jordan@meridiananalytics.io" },
    ],
    documents: [
      { name: "Pitch Deck", type: "PDF", date: "Nov 2024", size: "4.2 MB" },
      { name: "Financial Model", type: "Excel", date: "Dec 2024", size: "2.8 MB" },
      { name: "Data Room Index", type: "PDF", date: "Jan 2025", size: "1.1 MB" },
    ],
    dueDiligenceItems: [
      { category: "Financial", item: "3-year audited financials", status: "complete" },
      { category: "Legal", item: "Cap table review", status: "in_progress" },
      { category: "Technical", item: "Product architecture review", status: "pending" },
    ],
    timeline: [
      { date: "2024-10-15", event: "Initial outreach", type: "outreach" },
      { date: "2024-11-08", event: "Partner meeting", type: "meeting" },
      { date: "2024-12-12", event: "Term sheet issued", type: "milestone" },
      { date: "2025-01-20", event: "Due diligence kickoff", type: "milestone" },
    ],
  },
  {
    id: "deal_002", companyName: "Orbis Health", industry: "HealthTech", dealType: "investment",
    stage: "term_sheet", dealSize: 5000000, valuation: 32000000, targetRevenue: 2800000,
    assignedTo: "Sarah Chen", priority: "high", closingDate: "2025-04-15",
    ndaSigned: true, dataRoomAccess: false,
    overview: "Orbis Health builds AI-powered care coordination tools for value-based care networks, reducing readmissions by 34%.",
    thesis: "Proven clinical outcomes, $12B TAM, and strong regulatory tailwinds with CMS value-based care mandates expanding in 2025.",
    financials: { arr: 2800000, nrr: 128, growth: 84, ebitda: -900000 },
    synergies: [
      { type: "Portfolio", value: "Integration with HealthVault platform", confidence: "High" },
    ],
    contacts: [
      { name: "Dr. Maya Patel", role: "CEO", email: "maya@orbishealth.com" },
    ],
    documents: [
      { name: "Pitch Deck", type: "PDF", date: "Dec 2024", size: "5.1 MB" },
      { name: "Clinical Data Summary", type: "PDF", date: "Jan 2025", size: "3.2 MB" },
    ],
    dueDiligenceItems: [
      { category: "Financial", item: "Revenue recognition review", status: "in_progress" },
      { category: "Clinical", item: "Outcomes data validation", status: "pending" },
    ],
    timeline: [
      { date: "2024-11-20", event: "Warm intro via LP", type: "outreach" },
      { date: "2025-01-10", event: "Investment committee presentation", type: "meeting" },
      { date: "2025-02-14", event: "Term sheet issued", type: "milestone" },
    ],
  },
  {
    id: "deal_003", companyName: "FluxEnergy", industry: "Climate Tech", dealType: "investment",
    stage: "sourcing", dealSize: 12000000, valuation: 80000000, targetRevenue: 7200000,
    assignedTo: "Priya Nair", priority: "medium", closingDate: "2025-06-30",
    ndaSigned: false, dataRoomAccess: false,
    overview: "FluxEnergy develops grid-scale battery management software enabling utilities to optimize renewable energy storage and distribution.",
    thesis: "Massive tailwind from IRA incentives, $40B utility software market largely untouched by modern SaaS players.",
    financials: { arr: 7200000, nrr: 118, growth: 62, ebitda: -2100000 },
    synergies: [
      { type: "Portfolio", value: "Complements GreenRoute sustainability thesis", confidence: "Medium" },
    ],
    contacts: [
      { name: "Sam Torres", role: "CEO", email: "sam@fluxenergy.io" },
    ],
    documents: [
      { name: "One-pager", type: "PDF", date: "Feb 2025", size: "1.8 MB" },
    ],
    dueDiligenceItems: [],
    timeline: [
      { date: "2025-02-01", event: "Conference introduction", type: "outreach" },
      { date: "2025-02-28", event: "Initial partner call", type: "meeting" },
    ],
  },
  {
    id: "deal_004", companyName: "Stackr", industry: "DevTools", dealType: "acquisition",
    stage: "loi", dealSize: 22000000, valuation: 22000000, targetRevenue: 3100000,
    assignedTo: "Marcus Williams", priority: "high", closingDate: "2025-05-01",
    ndaSigned: true, dataRoomAccess: true,
    overview: "Stackr provides developer platform tooling used by 8,000+ engineering teams. Strategic acquisition to bolster RetailEdge's platform capabilities.",
    thesis: "Bolt-on acquisition at 7x ARR with immediate cross-sell opportunity across existing portfolio. Low integration risk.",
    financials: { arr: 3100000, nrr: 108, growth: 22, ebitda: 400000 },
    synergies: [
      { type: "Revenue", value: "Immediate cross-sell to RetailEdge customer base (800+ accounts)", confidence: "High" },
      { type: "Product", value: "Native integration accelerates RetailEdge roadmap by 18 months", confidence: "High" },
    ],
    contacts: [
      { name: "Chris Nakamura", role: "CEO & Co-founder", email: "chris@stackr.dev" },
      { name: "Kelly Shaw", role: "Legal Counsel", email: "kelly@stackr.dev" },
    ],
    documents: [
      { name: "CIM", type: "PDF", date: "Dec 2024", size: "8.4 MB" },
      { name: "LOI Draft", type: "PDF", date: "Feb 2025", size: "0.9 MB" },
      { name: "IP Schedule", type: "Excel", date: "Feb 2025", size: "1.2 MB" },
    ],
    dueDiligenceItems: [
      { category: "IP", item: "IP ownership review", status: "in_progress" },
      { category: "Legal", item: "Material contracts review", status: "in_progress" },
      { category: "Financial", item: "QoE analysis", status: "complete" },
    ],
    timeline: [
      { date: "2024-10-01", event: "Strategic review initiated", type: "milestone" },
      { date: "2024-12-15", event: "Management presentation", type: "meeting" },
      { date: "2025-02-01", event: "LOI signed", type: "milestone" },
    ],
  },
  {
    id: "deal_005", companyName: "WealthBridge", industry: "Fintech", dealType: "investment",
    stage: "closed", dealSize: 6500000, valuation: 48000000, targetRevenue: 5600000,
    assignedTo: "Venu Vegi", priority: "high", closingDate: "2025-01-15",
    ndaSigned: true, dataRoomAccess: true,
    overview: "WealthBridge is a B2B2C wealth management platform for community banks and credit unions serving 2M+ end customers.",
    thesis: "Closed Jan 2025. $48M pre-money, 18.5% ownership. Strong ARPU growth and sticky enterprise contracts.",
    financials: { arr: 5600000, nrr: 132, growth: 76, ebitda: -800000 },
    synergies: [
      { type: "Portfolio", value: "NovaPay payment rails integration", confidence: "High" },
    ],
    contacts: [
      { name: "Rachel Kim", role: "CEO", email: "rachel@wealthbridge.com" },
    ],
    documents: [
      { name: "Closing Documents", type: "PDF", date: "Jan 2025", size: "12.1 MB" },
    ],
    dueDiligenceItems: [
      { category: "All", item: "DD completed", status: "complete" },
    ],
    timeline: [
      { date: "2024-08-10", event: "Initial meeting", type: "outreach" },
      { date: "2024-11-01", event: "Term sheet", type: "milestone" },
      { date: "2025-01-15", event: "Deal closed", type: "milestone" },
    ],
  },
];
for (const d of deals) {
  await upsert("deals", d);
}
console.log(`  ✓ ${deals.length} deals`);

// ─── 5. Engagements ───────────────────────────────────────────────────────────
console.log("Seeding engagements...");
const engagements = [
  {
    id: "eng_001", clientName: "NovaPay", serviceType: "fpa", status: "active",
    startDate: "2025-01-01", endDate: "2025-06-30", fee: 72000, progress: 48,
    lead: "Venu Vegi",
    description: "Monthly FP&A support including budget vs actuals, rolling forecast, and board pack preparation.",
    deliverables: ["Monthly board pack", "Rolling 12-month forecast", "KPI dashboard", "Budget variance analysis"],
    team: [{ name: "Venu Vegi", role: "Lead" }, { name: "Sarah Chen", role: "Analyst" }],
  },
  {
    id: "eng_002", clientName: "DataStream AI", serviceType: "strategic_finance", status: "active",
    startDate: "2024-10-01", endDate: "2025-03-31", fee: 95000, progress: 85,
    lead: "Sarah Chen",
    description: "Series B fundraising readiness, operating model enhancement, and investor materials.",
    deliverables: ["Series B financial model", "Investor deck financials", "Comparable analysis", "Data room prep"],
    team: [{ name: "Sarah Chen", role: "Lead" }, { name: "Priya Nair", role: "Analyst" }],
  },
  {
    id: "eng_003", clientName: "GreenRoute Logistics", serviceType: "due_diligence", status: "active",
    startDate: "2025-02-01", endDate: null, fee: 48000, progress: 62,
    lead: "Priya Nair",
    description: "Buy-side financial due diligence and QoE analysis for acquisition target.",
    deliverables: ["QoE report", "Normalized EBITDA analysis", "Working capital assessment", "Integration cost model"],
    team: [{ name: "Priya Nair", role: "Lead" }, { name: "Marcus Williams", role: "Analyst" }],
  },
  {
    id: "eng_004", clientName: "RetailEdge", serviceType: "corp_dev", status: "active",
    startDate: "2025-01-15", endDate: null, fee: 120000, progress: 35,
    lead: "Marcus Williams",
    description: "M&A advisory for add-on acquisition strategy and target identification.",
    deliverables: ["Target screening list", "Strategic fit analysis", "Valuation framework", "LOI support"],
    team: [{ name: "Marcus Williams", role: "Lead" }, { name: "Venu Vegi", role: "Advisor" }],
  },
  {
    id: "eng_005", clientName: "HealthVault", serviceType: "valuation", status: "completed",
    startDate: "2024-11-01", endDate: "2024-12-31", fee: 35000, progress: 100,
    lead: "Venu Vegi",
    description: "409A valuation and cap table optimization analysis.",
    deliverables: ["409A valuation report", "Cap table model", "Option pool analysis"],
    team: [{ name: "Venu Vegi", role: "Lead" }],
  },
  {
    id: "eng_006", clientName: "EduCore", serviceType: "fpa", status: "proposal",
    startDate: "2025-04-01", endDate: null, fee: 24000, progress: 0,
    lead: "Sarah Chen",
    description: "Financial model buildout and seed-round financial projections.",
    deliverables: ["3-year financial model", "Unit economics analysis", "Investor-ready projections"],
    team: [{ name: "Sarah Chen", role: "Lead" }],
  },
];
for (const e of engagements) {
  await upsert("engagements", e);
}
console.log(`  ✓ ${engagements.length} engagements`);

await client.end();
console.log("\n✅ Seed complete — all tables populated.");
