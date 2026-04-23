import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAuth, getMetricValues, getTrendValues } from "../_utils.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") { err(res, "Method not allowed", 405); return; }

  const email = await requireAuth(req, res);
  if (!email) return;

  const metric = req.query["metric"] as string;

  try {
    const [m, t] = await Promise.all([getMetricValues(metric), getTrendValues(metric)]);

    if (metric === "operations") {
      const hcTrend = t.get("headcount") ?? [];
      const burnTrend = t.get("burn") ?? [];
      const runwayTrend = t.get("runway") ?? [];
      const headcountTrend = hcTrend.length
        ? hcTrend.map((r) => ({ month: r.month, hc: r.value }))
        : [
            { month: "Jan", hc: 48 }, { month: "Feb", hc: 52 }, { month: "Mar", hc: 55 },
            { month: "Apr", hc: 58 }, { month: "May", hc: 62 }, { month: "Jun", hc: 67 },
            { month: "Jul", hc: 71 }, { month: "Aug", hc: 74 }, { month: "Sep", hc: 78 },
            { month: "Oct", hc: 82 }, { month: "Nov", hc: 85 }, { month: "Dec", hc: m.get("totalHeadcount") ?? 89 },
          ];
      const burnRunway = burnTrend.length
        ? burnTrend.map((r, i) => ({ month: r.month, burn: r.value, runway: runwayTrend[i]?.value ?? 14 }))
        : [
            { month: "Jan", burn: 2.1, runway: 22 }, { month: "Feb", burn: 2.3, runway: 20 },
            { month: "Mar", burn: 2.4, runway: 19 }, { month: "Apr", burn: 2.6, runway: 18 },
            { month: "May", burn: 2.7, runway: 18 }, { month: "Jun", burn: 2.9, runway: 17 },
            { month: "Jul", burn: 3.0, runway: 17 }, { month: "Aug", burn: 3.1, runway: 16 },
            { month: "Sep", burn: 3.2, runway: 16 }, { month: "Oct", burn: 3.3, runway: 15 },
            { month: "Nov", burn: 3.4, runway: 15 }, { month: "Dec", burn: m.get("monthlyBurnM") ?? 3.5, runway: m.get("cashRunwayMonths") ?? 14 },
          ];
      ok(res, {
        totalHeadcount: m.get("totalHeadcount") ?? 89,
        monthlyBurnM: m.get("monthlyBurnM") ?? 3.5,
        cashRunwayMonths: m.get("cashRunwayMonths") ?? 14,
        grossMarginPct: m.get("grossMarginPct") ?? 81.4,
        headcountTrend,
        burnRunway,
        unitEconomics: [
          { metric: "Revenue per Employee", value: "$287K", prev: "$264K", delta: 8.7, good: true },
          { metric: "Gross Margin", value: `${(m.get("grossMarginPct") ?? 81.4).toFixed(1)}%`, prev: "78.2%", delta: 3.2, good: true },
          { metric: "CAC Payback Period", value: "14 months", prev: "18 months", delta: -22.2, good: true },
          { metric: "ARR per Sales Rep", value: "$1.4M", prev: "$1.1M", delta: 27.3, good: true },
          { metric: "Support Tickets / Employee", value: "4.2", prev: "5.1", delta: -17.6, good: true },
          { metric: "G&A as % of Revenue", value: "11.2%", prev: "13.8%", delta: -18.8, good: true },
          { metric: "Net Revenue Retention", value: "118%", prev: "112%", delta: 5.4, good: true },
          { metric: "Magic Number", value: "1.4x", prev: "1.1x", delta: 27.3, good: true },
        ],
      });

    } else if (metric === "product") {
      const dauTrend = t.get("dau") ?? [];
      const mauTrend = t.get("mau") ?? [];
      const engagementTrend = dauTrend.length
        ? dauTrend.map((r, i) => ({ month: r.month, dau: r.value, mau: mauTrend[i]?.value ?? 0 }))
        : [
            { month: "Jan", dau: 4200, mau: 18400 }, { month: "Feb", dau: 4800, mau: 19200 },
            { month: "Mar", dau: 5100, mau: 20100 }, { month: "Apr", dau: 5600, mau: 21400 },
            { month: "May", dau: 6100, mau: 22800 }, { month: "Jun", dau: 6800, mau: 24200 },
            { month: "Jul", dau: 7200, mau: 25600 }, { month: "Aug", dau: 7600, mau: 26900 },
            { month: "Sep", dau: 8100, mau: 28400 }, { month: "Oct", dau: 8700, mau: 30100 },
            { month: "Nov", dau: 9200, mau: 31800 }, { month: "Dec", dau: m.get("dauCount") ?? 9800, mau: m.get("mauCount") ?? 33400 },
          ];
      ok(res, {
        dauCount: m.get("dauCount") ?? 9800,
        mauCount: m.get("mauCount") ?? 33400,
        dauMauRatio: m.get("dauMauRatio") ?? 29.3,
        churnRatePct: m.get("churnRatePct") ?? 2.1,
        engagementTrend,
        featureAdoption: [
          { feature: "Cash Flow Dashboard", adoption: 84 },
          { feature: "Portfolio Analytics", adoption: 76 },
          { feature: "M&A Deal Tracker", adoption: 61 },
          { feature: "Expense Reports", adoption: 58 },
          { feature: "Benchmark Compare", adoption: 47 },
          { feature: "AI Insights", adoption: 39 },
          { feature: "Data Export", adoption: 33 },
        ],
        churnWaterfall: [
          { name: "Start", value: 312, type: "base" },
          { name: "New", value: 48, type: "pos" },
          { name: "Expansion", value: 22, type: "pos" },
          { name: "Contraction", value: -14, type: "neg" },
          { name: "Churn", value: -24, type: "neg" },
          { name: "End", value: 344, type: "base" },
        ],
      });

    } else if (metric === "marketing") {
      const mqlTrend = t.get("mql") ?? [];
      ok(res, {
        totalMQLs: m.get("totalMQLs") ?? (mqlTrend.at(-1)?.value ?? 1600),
        blendedCAC: m.get("blendedCAC") ?? 740,
        marketingPipelineM: m.get("marketingPipelineM") ?? 3.1,
        avgCampaignROI: "4.4x",
        cacByChannel: [
          { channel: "Organic / SEO", cac: 420, leads: 340, color: "#22C55E" },
          { channel: "Content / Blog", cac: 580, leads: 210, color: "#2563EB" },
          { channel: "Paid Search", cac: 1240, leads: 480, color: "#EF4444" },
          { channel: "Social Ads", cac: 980, leads: 290, color: "#D97706" },
          { channel: "Webinars", cac: 720, leads: 160, color: "#7C3AED" },
          { channel: "Partner Referral", cac: 380, leads: 120, color: "#0891B2" },
        ],
        leadFunnel: [
          { stage: "Website Visits", value: 48200 },
          { stage: "MQL", value: m.get("totalMQLs") ?? (mqlTrend.at(-1)?.value ?? 1600) },
          { stage: "SQL", value: 480 },
          { stage: "Opportunity", value: 192 },
          { stage: "Closed Won", value: 64 },
        ],
        mqlTrend: mqlTrend.length
          ? mqlTrend
          : [
              { month: "Jan", value: 780 }, { month: "Feb", value: 850 }, { month: "Mar", value: 920 },
              { month: "Apr", value: 1010 }, { month: "May", value: 1090 }, { month: "Jun", value: 1180 },
              { month: "Jul", value: 1260 }, { month: "Aug", value: 1340 }, { month: "Sep", value: 1400 },
              { month: "Oct", value: 1480 }, { month: "Nov", value: 1540 }, { month: "Dec", value: 1600 },
            ],
        campaigns: [
          { name: "Q4 ABM Campaign", channel: "Email", spend: 12000, leads: 184, pipeline: 820000, roi: "6.8x" },
          { name: "Finance Summit Sponsorship", channel: "Event", spend: 25000, leads: 96, pipeline: 640000, roi: "2.6x" },
          { name: "CFO Playbook Content", channel: "Content", spend: 8000, leads: 210, pipeline: 440000, roi: "5.5x" },
          { name: "Google Ads — FinanceSaaS", channel: "Paid Search", spend: 18000, leads: 380, pipeline: 560000, roi: "3.1x" },
          { name: "LinkedIn Retargeting", channel: "Social", spend: 9000, leads: 142, pipeline: 320000, roi: "3.6x" },
          { name: "Partner Co-Marketing", channel: "Partner", spend: 6000, leads: 88, pipeline: 290000, roi: "4.8x" },
        ],
        attribution: [
          { name: "Organic / SEO", value: 28, color: "#22C55E" },
          { name: "Paid Search", value: 24, color: "#EF4444" },
          { name: "Content", value: 19, color: "#2563EB" },
          { name: "Social", value: 14, color: "#D97706" },
          { name: "Events", value: 9, color: "#7C3AED" },
          { name: "Partner", value: 6, color: "#0891B2" },
        ],
      });

    } else if (metric === "sales") {
      const actualTrend = t.get("bookings_actual") ?? [];
      const quotaTrend = t.get("bookings_quota") ?? [];
      const totalBookingsK = m.get("totalBookingsK") ?? 10100;
      const bookings = actualTrend.length
        ? actualTrend.map((r, i) => ({ month: r.month, actual: r.value, quota: quotaTrend[i]?.value ?? r.value }))
        : [
            { month: "Jan", quota: 600, actual: 520 }, { month: "Feb", quota: 650, actual: 640 },
            { month: "Mar", quota: 700, actual: 760 }, { month: "Apr", quota: 750, actual: 710 },
            { month: "May", quota: 800, actual: 840 }, { month: "Jun", quota: 850, actual: 900 },
            { month: "Jul", quota: 900, actual: 870 }, { month: "Aug", quota: 950, actual: 980 },
            { month: "Sep", quota: 1000, actual: 1080 }, { month: "Oct", quota: 1050, actual: 1020 },
            { month: "Nov", quota: 1100, actual: 1180 }, { month: "Dec", quota: 1150, actual: 1240 },
          ];
      ok(res, {
        totalBookingsK,
        avgDealSizeK: m.get("avgDealSizeK") ?? 48,
        winRatePct: m.get("winRatePct") ?? 28.4,
        quotaAttainmentPct: m.get("quotaAttainmentPct") ?? 108,
        arrBridge: [
          { name: "Open ARR", value: 8200, type: "base" },
          { name: "New Logos", value: 1840, type: "pos" },
          { name: "Expansion", value: 920, type: "pos" },
          { name: "Contraction", value: -380, type: "neg" },
          { name: "Churn", value: -480, type: "neg" },
          { name: "Close ARR", value: totalBookingsK, type: "base" },
        ],
        pipeline: [
          { stage: "Prospecting", count: 124, value: 4800 },
          { stage: "Qualified", count: 68, value: 3200 },
          { stage: "Demo/Eval", count: 41, value: 2400 },
          { stage: "Proposal", count: 22, value: 1800 },
          { stage: "Negotiation", count: 11, value: 1200 },
          { stage: "Closed Won", count: 8, value: 960 },
        ],
        bookings,
        acvBySegment: [
          { segment: "Enterprise", acv: 148000, deals: 12 },
          { segment: "Mid-Market", acv: 52000, deals: 34 },
          { segment: "SMB", acv: 14000, deals: 88 },
          { segment: "Startup", acv: 8000, deals: 56 },
        ],
      });

    } else if (metric === "people") {
      const hiresActual = t.get("new_hires") ?? [];
      const hiresAttrition = t.get("attrition_count") ?? [];
      const hiringPlan = hiresActual.length
        ? hiresActual.map((r, i) => ({ month: r.month, actual: r.value, plan: (hiresAttrition[i]?.value ?? 0) > 0 ? r.value + 2 : r.value + 1 }))
        : [
            { month: "Jan", actual: 3, plan: 4 }, { month: "Feb", actual: 4, plan: 4 },
            { month: "Mar", actual: 5, plan: 5 }, { month: "Apr", actual: 3, plan: 4 },
            { month: "May", actual: 6, plan: 5 }, { month: "Jun", actual: 5, plan: 6 },
            { month: "Jul", actual: 4, plan: 5 }, { month: "Aug", actual: 7, plan: 6 },
            { month: "Sep", actual: 4, plan: 5 }, { month: "Oct", actual: 5, plan: 5 },
            { month: "Nov", actual: 6, plan: 6 }, { month: "Dec", actual: 7, plan: 6 },
          ];
      ok(res, {
        totalHeadcount: m.get("totalHeadcount") ?? 89,
        openRoles: m.get("openRoles") ?? 14,
        attritionRatePct: m.get("attritionRatePct") ?? 10.8,
        avgTenureMonths: m.get("avgTenureMonths") ?? 22.4,
        headcountByDept: [
          { dept: "Engineering", hc: m.get("hc_engineering") ?? 34, color: "#2563EB" },
          { dept: "Sales", hc: m.get("hc_sales") ?? 18, color: "#22C55E" },
          { dept: "Marketing", hc: m.get("hc_marketing") ?? 10, color: "#7C3AED" },
          { dept: "G&A", hc: m.get("hc_ga") ?? 12, color: "#D97706" },
          { dept: "Product", hc: m.get("hc_product") ?? 11, color: "#0891B2" },
          { dept: "Support", hc: m.get("hc_support") ?? 4, color: "#64748B" },
        ],
        hiringPlan,
        attrition: [
          { dept: "Engineering", rate: m.get("attrition_engineering") ?? 8.2 },
          { dept: "Sales", rate: m.get("attrition_sales") ?? 14.6 },
          { dept: "Marketing", rate: m.get("attrition_marketing") ?? 10.1 },
          { dept: "G&A", rate: m.get("attrition_ga") ?? 6.4 },
          { dept: "Product", rate: m.get("attrition_product") ?? 7.8 },
          { dept: "Support", rate: m.get("attrition_support") ?? 16.2 },
        ],
        compensation: [
          { dept: "Engineering", salary: 148000, bonus: 18000, equity: 42000 },
          { dept: "Sales", salary: 92000, bonus: 38000, equity: 18000 },
          { dept: "Marketing", salary: 112000, bonus: 16000, equity: 22000 },
          { dept: "G&A", salary: 104000, bonus: 14000, equity: 16000 },
          { dept: "Product", salary: 138000, bonus: 16000, equity: 36000 },
          { dept: "Support", salary: 72000, bonus: 8000, equity: 8000 },
        ],
      });

    } else if (metric === "cashflow") {
      const inflowsTrend = t.get("inflows") ?? [];
      const outflowsTrend = t.get("outflows") ?? [];
      const monthly = inflowsTrend.length
        ? inflowsTrend.map((r, i) => ({
            month: r.month,
            inflows: r.value,
            outflows: outflowsTrend[i]?.value ?? 0,
            net: r.value - (outflowsTrend[i]?.value ?? 0),
          }))
        : [
            { month: "Jan", inflows: 3200, outflows: 2800, net: 400 },
            { month: "Feb", inflows: 3600, outflows: 3100, net: 500 },
            { month: "Mar", inflows: 3100, outflows: 2950, net: 150 },
            { month: "Apr", inflows: 4200, outflows: 3400, net: 800 },
            { month: "May", inflows: 4500, outflows: 3700, net: 800 },
            { month: "Jun", inflows: 4800, outflows: 4000, net: 800 },
            { month: "Jul", inflows: 5100, outflows: 4100, net: 1000 },
            { month: "Aug", inflows: 4700, outflows: 4200, net: 500 },
            { month: "Sep", inflows: 5300, outflows: 4400, net: 900 },
            { month: "Oct", inflows: 5800, outflows: 4600, net: 1200 },
            { month: "Nov", inflows: 6100, outflows: 4800, net: 1300 },
            { month: "Dec", inflows: 6400, outflows: 5000, net: 1400 },
          ];
      ok(res, {
        totalInflowsM: m.get("totalInflowsM") ?? 56.8,
        totalOutflowsM: m.get("totalOutflowsM") ?? 44.1,
        netCashFlowM: m.get("netCashFlowM") ?? 12.7,
        cashOnHandM: m.get("cashOnHandM") ?? 18.4,
        monthly,
        waterfall: [
          { name: "Opening", value: 5200, type: "balance" },
          { name: "Operating CF", value: 8400, type: "positive" },
          { name: "Investing CF", value: -3200, type: "negative" },
          { name: "Financing CF", value: 2100, type: "positive" },
          { name: "Closing", value: 12500, type: "balance" },
        ],
        breakdown: [
          { category: "Customer Receipts", type: "Operating", q1: 9200, q2: 11400, q3: 14200, q4: 18300 },
          { category: "Supplier Payments", type: "Operating", q1: -4100, q2: -5200, q3: -6100, q4: -7800 },
          { category: "Payroll & Benefits", type: "Operating", q1: -2800, q2: -2900, q3: -3100, q4: -3400 },
          { category: "Equipment Purchase", type: "Investing", q1: -1200, q2: -800, q3: -600, q4: -600 },
          { category: "Software & IP", type: "Investing", q1: -400, q2: -600, q3: -400, q4: -600 },
          { category: "Loan Drawdown", type: "Financing", q1: 2000, q2: 0, q3: 0, q4: 100 },
          { category: "Loan Repayment", type: "Financing", q1: -500, q2: -500, q3: -500, q4: -600 },
        ],
      });

    } else {
      err(res, `Unknown metric: ${metric}`, 404);
    }
  } catch (e) {
    err(res, (e as Error).message, 500);
  }
}
