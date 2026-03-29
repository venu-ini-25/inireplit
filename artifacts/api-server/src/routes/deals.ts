import { Router, type IRouter } from "express";
import {
  GetDealsResponse,
  GetDealResponse,
  GetDealPipelineSummaryResponse,
  GetDealsQueryParams,
} from "@workspace/api-zod";
import { db, deals } from "@workspace/db";
import { asc } from "drizzle-orm";

const router: IRouter = Router();

const MOCK_DEALS = [
  {
    id: "deal_001",
    companyName: "Meridian Analytics",
    industry: "Data & Analytics",
    dealType: "acquisition",
    stage: "due_diligence",
    dealSize: 45000000,
    valuation: 52000000,
    targetRevenue: 7200000,
    assignedTo: "Sarah Chen",
    priority: "high",
    createdAt: "2025-01-15T00:00:00Z",
    updatedAt: "2025-03-20T00:00:00Z",
    closingDate: "2025-06-30T00:00:00Z",
    ndaSigned: true,
    dataRoomAccess: true,
    overview: "SaaS analytics platform targeting enterprise finance teams. $45M all-cash acquisition. Strong ARR of $7.2M with 112% NRR.",
    thesis: "Cross-sell iNi platform to Meridian's 200+ enterprise customers. Accelerate product roadmap by 12 months with Meridian's analytics IP.",
    financials: { arr: 7200000, nrr: 112, growth: 68, ebitda: -420000 },
    synergies: [
      { type: "Revenue Synergy", value: "$2.1M", confidence: "High" },
      { type: "Cost Elimination", value: "$840K", confidence: "Medium" },
      { type: "Customer Cross-sell", value: "$3.4M", confidence: "Medium" },
    ],
    contacts: [
      { name: "Alex Rivera", role: "CEO", email: "alex@meridian.io" },
      { name: "Kim Park", role: "CFO", email: "kim@meridian.io" },
      { name: "Sarah Chen", role: "Lead Partner (iNi)", email: "sarah@inventninvest.com" },
    ],
    documents: [
      { name: "NDA — Meridian Analytics.pdf", type: "NDA", date: "Jan 15, 2025", size: "180 KB" },
      { name: "LOI — Draft v2.docx", type: "LOI", date: "Feb 10, 2025", size: "240 KB" },
      { name: "Meridian — CIM.pdf", type: "CIM", date: "Feb 20, 2025", size: "4.2 MB" },
      { name: "QoE Report — EY.pdf", type: "QoE", date: "Mar 5, 2025", size: "2.8 MB" },
      { name: "Cap Table — Current.xlsx", type: "Cap Table", date: "Mar 12, 2025", size: "95 KB" },
    ],
    dueDiligenceItems: [
      { category: "Governance & Legal", item: "NDA executed", status: "completed", assignedTo: "Legal Team", dueDate: "2025-01-15T00:00:00Z" },
      { category: "Governance & Legal", item: "LOI / term sheet agreed", status: "completed", assignedTo: "Legal Team", dueDate: "2025-02-10T00:00:00Z" },
      { category: "Governance & Legal", item: "Legal entity structure verified", status: "completed", assignedTo: "Legal Team", dueDate: "2025-02-28T00:00:00Z" },
      { category: "Governance & Legal", item: "IP & contracts reviewed", status: "in_progress", assignedTo: "Legal Team", dueDate: "2025-04-20T00:00:00Z" },
      { category: "Governance & Legal", item: "Litigation & contingent liabilities", status: "pending", assignedTo: "Legal Team", dueDate: "2025-05-01T00:00:00Z" },
      { category: "Financial & Accounting", item: "Financial statements (3yr) reviewed", status: "completed", assignedTo: "Sarah Chen", dueDate: "2025-03-15T00:00:00Z" },
      { category: "Financial & Accounting", item: "QoE analysis complete", status: "completed", assignedTo: "Sarah Chen", dueDate: "2025-03-20T00:00:00Z" },
      { category: "Financial & Accounting", item: "Working capital analysis", status: "completed", assignedTo: "Analyst Team", dueDate: "2025-03-20T00:00:00Z" },
      { category: "Financial & Accounting", item: "Debt & liabilities schedule", status: "in_progress", assignedTo: "Analyst Team", dueDate: "2025-04-15T00:00:00Z" },
      { category: "Financial & Accounting", item: "Revenue recognition policy reviewed", status: "completed", assignedTo: "Sarah Chen", dueDate: "2025-03-10T00:00:00Z" },
      { category: "Financial & Accounting", item: "Tax obligations and filings verified", status: "pending", assignedTo: "Analyst Team", dueDate: "2025-05-01T00:00:00Z" },
      { category: "Commercial & Market", item: "Customer concentration analysis", status: "completed", assignedTo: "Marcus Williams", dueDate: "2025-03-20T00:00:00Z" },
      { category: "Commercial & Market", item: "Top 10 customer interviews", status: "in_progress", assignedTo: "Marcus Williams", dueDate: "2025-04-12T00:00:00Z" },
      { category: "Commercial & Market", item: "Competitive landscape assessment", status: "completed", assignedTo: "Analyst Team", dueDate: "2025-03-20T00:00:00Z" },
      { category: "Commercial & Market", item: "Market size & growth validation", status: "pending", assignedTo: "Analyst Team", dueDate: "2025-04-25T00:00:00Z" },
      { category: "Commercial & Market", item: "Product roadmap & IP review", status: "in_progress", assignedTo: "Tech Advisor", dueDate: "2025-04-10T00:00:00Z" },
      { category: "People & Culture", item: "Management interviews completed", status: "completed", assignedTo: "Sarah Chen", dueDate: "2025-02-28T00:00:00Z" },
      { category: "People & Culture", item: "Org chart & key roles verified", status: "completed", assignedTo: "HR Lead", dueDate: "2025-03-25T00:00:00Z" },
      { category: "People & Culture", item: "Employee & equity schedule", status: "in_progress", assignedTo: "HR Lead", dueDate: "2025-04-15T00:00:00Z" },
      { category: "People & Culture", item: "Retention risk assessment", status: "pending", assignedTo: "HR Lead", dueDate: "2025-05-01T00:00:00Z" },
      { category: "People & Culture", item: "Culture alignment evaluation", status: "pending", assignedTo: "HR Lead", dueDate: "2025-05-01T00:00:00Z" },
      { category: "Technology & Operations", item: "Technical architecture review", status: "in_progress", assignedTo: "Tech Advisor", dueDate: "2025-04-10T00:00:00Z" },
      { category: "Technology & Operations", item: "Data room access granted", status: "completed", assignedTo: "Sarah Chen", dueDate: "2025-02-20T00:00:00Z" },
      { category: "Technology & Operations", item: "Security & compliance audit", status: "pending", assignedTo: "Tech Advisor", dueDate: "2025-04-25T00:00:00Z" },
    ],
    timeline: [
      { date: "2025-01-10T00:00:00Z", event: "Initial Outreach", description: "First contact via network referral from Sequoia Capital", type: "milestone" },
      { date: "2025-01-15T00:00:00Z", event: "NDA Signed", description: "Mutual NDA executed via iNi platform", type: "document" },
      { date: "2025-01-28T00:00:00Z", event: "Management Presentation", description: "Full team intro with CEO Alex Rivera and CFO Kim Park", type: "meeting" },
      { date: "2025-02-10T00:00:00Z", event: "LOI Submitted", description: "Non-binding letter of intent at $45M all-cash", type: "document" },
      { date: "2025-03-01T00:00:00Z", event: "Due Diligence Started", description: "Financial, legal, and tech workstreams initiated", type: "milestone" },
      { date: "2025-04-01T00:00:00Z", event: "Final Offer", description: "Final binding offer anticipated post-DD completion", type: "milestone" },
      { date: "2025-05-01T00:00:00Z", event: "Signing", description: "Definitive agreement execution", type: "milestone" },
      { date: "2025-06-30T00:00:00Z", event: "Closing", description: "Expected regulatory clearance and funds transfer", type: "milestone" },
    ],
  },
  {
    id: "deal_002",
    companyName: "FlexForce HR",
    industry: "HR Tech",
    dealType: "investment",
    stage: "nda",
    dealSize: 12000000,
    valuation: 38000000,
    targetRevenue: 3400000,
    assignedTo: "Marcus Williams",
    priority: "medium",
    createdAt: "2025-02-08T00:00:00Z",
    updatedAt: "2025-03-18T00:00:00Z",
    closingDate: "2025-08-15T00:00:00Z",
    ndaSigned: true,
    dataRoomAccess: false,
    overview: "HR Tech SaaS platform automating workforce management for mid-market. $12M Series B-extension investment. ARR of $3.4M growing 55% YoY.",
    thesis: "Strategic investment to expand iNi's portfolio in HR tech vertical. FlexForce's workforce analytics complements iNi's FP&A suite.",
    financials: { arr: 3400000, nrr: 105, growth: 55, ebitda: -680000 },
    synergies: [
      { type: "Portfolio Integration", value: "$480K", confidence: "Medium" },
      { type: "Customer Network", value: "$1.2M", confidence: "Low" },
    ],
    contacts: [
      { name: "Marcus Williams", role: "Lead Partner (iNi)", email: "marcus@inventninvest.com" },
      { name: "Jordan Lee", role: "CEO (FlexForce)" },
    ],
    documents: [
      { name: "NDA — FlexForce HR.pdf", type: "NDA", date: "Feb 18, 2025", size: "175 KB" },
      { name: "FlexForce — Overview Deck.pdf", type: "Pitch", date: "Feb 22, 2025", size: "3.1 MB" },
    ],
    dueDiligenceItems: [
      { category: "Governance & Legal", item: "NDA executed", status: "completed", assignedTo: "Legal Team", dueDate: "2025-02-18T00:00:00Z" },
      { category: "Governance & Legal", item: "LOI / term sheet agreed", status: "pending", assignedTo: "Legal Team", dueDate: "2025-04-01T00:00:00Z" },
      { category: "Governance & Legal", item: "Legal entity structure verified", status: "pending", assignedTo: "Legal Team", dueDate: "2025-04-15T00:00:00Z" },
      { category: "Financial & Accounting", item: "Financial statements (3yr) reviewed", status: "pending", assignedTo: "Marcus Williams", dueDate: "2025-04-20T00:00:00Z" },
      { category: "Financial & Accounting", item: "QoE analysis complete", status: "pending", assignedTo: "Analyst Team", dueDate: "2025-05-01T00:00:00Z" },
      { category: "Commercial & Market", item: "Customer concentration analysis", status: "in_progress", assignedTo: "Marcus Williams", dueDate: "2025-04-10T00:00:00Z" },
    ],
    timeline: [
      { date: "2025-02-08T00:00:00Z", event: "Initial Outreach", description: "Introduced via Y Combinator network", type: "milestone" },
      { date: "2025-02-18T00:00:00Z", event: "NDA Signed", description: "Mutual NDA executed", type: "document" },
      { date: "2025-03-10T00:00:00Z", event: "Management Presentation", description: "Intro call with CEO and Head of Product", type: "meeting" },
      { date: "2025-04-01T00:00:00Z", event: "Term Sheet", description: "Term sheet issuance expected", type: "milestone" },
    ],
  },
  {
    id: "deal_003",
    companyName: "GreenRoute Logistics",
    industry: "Supply Chain",
    dealType: "acquisition",
    stage: "negotiation",
    dealSize: 78000000,
    valuation: 88000000,
    targetRevenue: 14800000,
    assignedTo: "Priya Nair",
    priority: "high",
    createdAt: "2024-11-20T00:00:00Z",
    updatedAt: "2025-03-25T00:00:00Z",
    closingDate: "2025-05-15T00:00:00Z",
    ndaSigned: true,
    dataRoomAccess: true,
    overview: "Supply chain SaaS with $14.8M ARR and dominant position in last-mile optimization. $78M acquisition in negotiation.",
    thesis: "Strategic fit: iNi's portfolio has 3 supply chain companies that would benefit from GreenRoute's integration.",
    financials: { arr: 14800000, nrr: 108, growth: 42, ebitda: 1200000 },
    synergies: [
      { type: "Revenue Synergy", value: "$4.2M", confidence: "High" },
      { type: "Platform Integration", value: "$1.8M", confidence: "Medium" },
    ],
    contacts: [
      { name: "Priya Nair", role: "Lead Partner (iNi)", email: "priya@inventninvest.com" },
      { name: "Tom Haines", role: "CEO (GreenRoute)" },
    ],
    documents: [
      { name: "NDA — GreenRoute.pdf", type: "NDA", date: "Nov 18, 2024", size: "175 KB" },
      { name: "LOI — v1.docx", type: "LOI", date: "Jan 20, 2025", size: "220 KB" },
      { name: "GreenRoute — CIM.pdf", type: "CIM", date: "Jan 28, 2025", size: "5.1 MB" },
      { name: "QoE Report — Deloitte.pdf", type: "QoE", date: "Mar 1, 2025", size: "3.4 MB" },
    ],
    dueDiligenceItems: [
      { category: "Governance & Legal", item: "NDA executed", status: "completed", assignedTo: "Legal Team", dueDate: "2024-11-18T00:00:00Z" },
      { category: "Governance & Legal", item: "LOI / term sheet agreed", status: "completed", assignedTo: "Legal Team", dueDate: "2025-01-20T00:00:00Z" },
      { category: "Governance & Legal", item: "Legal entity structure verified", status: "completed", assignedTo: "Legal Team", dueDate: "2025-02-01T00:00:00Z" },
      { category: "Governance & Legal", item: "IP & contracts reviewed", status: "completed", assignedTo: "Legal Team", dueDate: "2025-02-28T00:00:00Z" },
      { category: "Financial & Accounting", item: "Financial statements (3yr) reviewed", status: "completed", assignedTo: "Priya Nair", dueDate: "2025-02-15T00:00:00Z" },
      { category: "Financial & Accounting", item: "QoE analysis complete", status: "completed", assignedTo: "Priya Nair", dueDate: "2025-03-05T00:00:00Z" },
      { category: "Financial & Accounting", item: "Working capital analysis", status: "completed", assignedTo: "Analyst Team", dueDate: "2025-03-10T00:00:00Z" },
      { category: "Commercial & Market", item: "Customer concentration analysis", status: "completed", assignedTo: "Priya Nair", dueDate: "2025-02-28T00:00:00Z" },
      { category: "Commercial & Market", item: "Top 10 customer interviews", status: "completed", assignedTo: "Priya Nair", dueDate: "2025-03-10T00:00:00Z" },
      { category: "Commercial & Market", item: "Competitive landscape assessment", status: "completed", assignedTo: "Analyst Team", dueDate: "2025-03-01T00:00:00Z" },
      { category: "People & Culture", item: "Management interviews completed", status: "completed", assignedTo: "Priya Nair", dueDate: "2025-03-15T00:00:00Z" },
      { category: "People & Culture", item: "Org chart & key roles verified", status: "completed", assignedTo: "HR Lead", dueDate: "2025-03-01T00:00:00Z" },
    ],
    timeline: [
      { date: "2024-11-05T00:00:00Z", event: "Initial Outreach", description: "Deal sourced from Bessemer Ventures co-investor", type: "milestone" },
      { date: "2024-11-18T00:00:00Z", event: "NDA Signed", description: "Mutual NDA executed", type: "document" },
      { date: "2024-12-10T00:00:00Z", event: "Management Presentation", description: "Full diligence kickoff with leadership team", type: "meeting" },
      { date: "2025-01-20T00:00:00Z", event: "LOI Submitted", description: "Non-binding LOI at $78M all-stock", type: "document" },
      { date: "2025-02-15T00:00:00Z", event: "Due Diligence Completed", description: "All workstreams finalized", type: "milestone" },
      { date: "2025-03-25T00:00:00Z", event: "Negotiation Ongoing", description: "Final price negotiation and rep & warranty terms", type: "update" },
      { date: "2025-05-15T00:00:00Z", event: "Expected Closing", description: "Target close pending regulatory clearance", type: "milestone" },
    ],
  },
  {
    id: "deal_004",
    companyName: "SkyBridge Capital",
    industry: "Financial Services",
    dealType: "merger",
    stage: "sourcing",
    dealSize: 120000000,
    valuation: 145000000,
    targetRevenue: 22000000,
    assignedTo: "James Park",
    priority: "low",
    createdAt: "2025-03-10T00:00:00Z",
    updatedAt: "2025-03-22T00:00:00Z",
    ndaSigned: false,
    dataRoomAccess: false,
    overview: "Alternative asset management firm managing $2.4B AUM. Merger opportunity to expand iNi's institutional investor footprint.",
    thesis: "Merger would add institutional LP relationships and expand iNi Capital's AUM significantly.",
    financials: { arr: 22000000, nrr: 98, growth: 18, ebitda: 4200000 },
    synergies: [
      { type: "AUM Expansion", value: "$2.4B managed", confidence: "High" },
      { type: "LP Network", value: "Strategic", confidence: "Medium" },
    ],
    contacts: [
      { name: "James Park", role: "Lead Partner (iNi)", email: "james@inventninvest.com" },
      { name: "Patricia Kim", role: "Managing Director (SkyBridge)" },
    ],
    documents: [
      { name: "SkyBridge — Teaser.pdf", type: "Teaser", date: "Mar 15, 2025", size: "2.2 MB" },
    ],
    dueDiligenceItems: [
      { category: "Governance & Legal", item: "NDA executed", status: "pending", assignedTo: "Legal Team", dueDate: "2025-04-01T00:00:00Z" },
      { category: "Governance & Legal", item: "LOI / term sheet agreed", status: "pending", assignedTo: "Legal Team", dueDate: "2025-05-01T00:00:00Z" },
    ],
    timeline: [
      { date: "2025-03-10T00:00:00Z", event: "Opportunity Identified", description: "Sourced via industry conference introduction", type: "milestone" },
      { date: "2025-03-22T00:00:00Z", event: "Preliminary Review", description: "Initial screening completed — passed to sourcing queue", type: "update" },
    ],
  },
  {
    id: "deal_005",
    companyName: "Orbit DevOps",
    industry: "Developer Tools",
    dealType: "investment",
    stage: "closing",
    dealSize: 18000000,
    valuation: 55000000,
    targetRevenue: 4900000,
    assignedTo: "Sarah Chen",
    priority: "high",
    createdAt: "2024-10-05T00:00:00Z",
    updatedAt: "2025-03-27T00:00:00Z",
    closingDate: "2025-04-15T00:00:00Z",
    ndaSigned: true,
    dataRoomAccess: true,
    overview: "Developer tools platform with $4.9M ARR growing 60% YoY. $18M Series B investment. Strong NRR of 128%.",
    thesis: "Investment in high-growth developer tools. Orbit's platform complements iNi's technical portfolio.",
    financials: { arr: 4900000, nrr: 128, growth: 60, ebitda: -810000 },
    synergies: [
      { type: "Investment Return", value: "3.5x targeted", confidence: "High" },
      { type: "Portfolio Synergy", value: "$620K", confidence: "Medium" },
    ],
    contacts: [
      { name: "Sarah Chen", role: "Lead Partner (iNi)", email: "sarah@inventninvest.com" },
      { name: "David Kim", role: "CEO (Orbit)", email: "david@orbitdevops.com" },
    ],
    documents: [
      { name: "Term Sheet — Orbit.pdf", type: "Term Sheet", date: "Nov 5, 2024", size: "310 KB" },
      { name: "Series B Agreement.pdf", type: "Investment", date: "Jan 20, 2025", size: "1.8 MB" },
      { name: "Cap Table — Orbit.xlsx", type: "Cap Table", date: "Feb 1, 2025", size: "88 KB" },
      { name: "Final Closing Checklist.pdf", type: "Closing", date: "Mar 25, 2025", size: "220 KB" },
    ],
    dueDiligenceItems: [
      { category: "Governance & Legal", item: "NDA executed", status: "completed", assignedTo: "Legal Team", dueDate: "2024-10-14T00:00:00Z" },
      { category: "Governance & Legal", item: "LOI / term sheet agreed", status: "completed", assignedTo: "Legal Team", dueDate: "2024-11-05T00:00:00Z" },
      { category: "Governance & Legal", item: "Legal entity structure verified", status: "completed", assignedTo: "Legal Team", dueDate: "2024-11-20T00:00:00Z" },
      { category: "Governance & Legal", item: "IP & contracts reviewed", status: "completed", assignedTo: "Legal Team", dueDate: "2024-12-10T00:00:00Z" },
      { category: "Governance & Legal", item: "Litigation & contingent liabilities", status: "completed", assignedTo: "Legal Team", dueDate: "2024-12-15T00:00:00Z" },
      { category: "Financial & Accounting", item: "Financial statements (3yr) reviewed", status: "completed", assignedTo: "Sarah Chen", dueDate: "2024-11-30T00:00:00Z" },
      { category: "Financial & Accounting", item: "QoE analysis complete", status: "completed", assignedTo: "Sarah Chen", dueDate: "2024-12-10T00:00:00Z" },
      { category: "Financial & Accounting", item: "Working capital analysis", status: "completed", assignedTo: "Analyst Team", dueDate: "2024-12-15T00:00:00Z" },
      { category: "Financial & Accounting", item: "Debt & liabilities schedule", status: "completed", assignedTo: "Analyst Team", dueDate: "2024-12-20T00:00:00Z" },
      { category: "Commercial & Market", item: "Customer concentration analysis", status: "completed", assignedTo: "Marcus Williams", dueDate: "2024-12-01T00:00:00Z" },
      { category: "Commercial & Market", item: "Top 10 customer interviews", status: "completed", assignedTo: "Marcus Williams", dueDate: "2024-12-15T00:00:00Z" },
      { category: "Commercial & Market", item: "Competitive landscape assessment", status: "completed", assignedTo: "Analyst Team", dueDate: "2024-12-01T00:00:00Z" },
      { category: "People & Culture", item: "Management interviews completed", status: "completed", assignedTo: "Sarah Chen", dueDate: "2024-12-10T00:00:00Z" },
      { category: "People & Culture", item: "Org chart & key roles verified", status: "completed", assignedTo: "HR Lead", dueDate: "2024-11-30T00:00:00Z" },
      { category: "Technology & Operations", item: "Technical architecture review", status: "completed", assignedTo: "Tech Advisor", dueDate: "2024-12-05T00:00:00Z" },
      { category: "Technology & Operations", item: "Data room access granted", status: "completed", assignedTo: "Sarah Chen", dueDate: "2024-10-25T00:00:00Z" },
      { category: "Technology & Operations", item: "Security & compliance audit", status: "completed", assignedTo: "Tech Advisor", dueDate: "2024-12-20T00:00:00Z" },
      { category: "Closing & Integration", item: "Final DD report drafted", status: "completed", assignedTo: "Sarah Chen", dueDate: "2025-01-10T00:00:00Z" },
      { category: "Closing & Integration", item: "Board approval received", status: "completed", assignedTo: "Sarah Chen", dueDate: "2025-01-20T00:00:00Z" },
      { category: "Closing & Integration", item: "Integration plan v1 complete", status: "in_progress", assignedTo: "Analyst Team", dueDate: "2025-04-01T00:00:00Z" },
      { category: "Closing & Integration", item: "Day 1 readiness checklist", status: "pending", assignedTo: "Analyst Team", dueDate: "2025-04-10T00:00:00Z" },
    ],
    timeline: [
      { date: "2024-10-01T00:00:00Z", event: "Initial Outreach", description: "Sourced from a16z Growth portfolio referral", type: "milestone" },
      { date: "2024-10-14T00:00:00Z", event: "NDA Signed", description: "Mutual NDA executed", type: "document" },
      { date: "2024-11-05T00:00:00Z", event: "Term Sheet", description: "Term sheet signed at $18M for 32.7% stake", type: "document" },
      { date: "2024-11-20T00:00:00Z", event: "Due Diligence Started", description: "All workstreams initiated simultaneously", type: "milestone" },
      { date: "2025-01-15T00:00:00Z", event: "Due Diligence Complete", description: "All 21 items cleared without material findings", type: "milestone" },
      { date: "2025-01-20T00:00:00Z", event: "Legal Docs Executed", description: "Series B investment agreement executed", type: "document" },
      { date: "2025-04-15T00:00:00Z", event: "Final Closing", description: "Funds transfer and cap table update", type: "milestone" },
    ],
  },
];

async function getDeals() {
  try {
    const rows = await db.select().from(deals).orderBy(asc(deals.createdAt));
    if (rows.length > 0) {
      return rows.map((d) => ({
        id: d.id,
        companyName: d.companyName,
        industry: d.industry,
        dealType: d.dealType,
        stage: d.stage,
        dealSize: d.dealSize,
        valuation: d.valuation,
        targetRevenue: d.targetRevenue,
        assignedTo: d.assignedTo,
        priority: d.priority,
        createdAt: d.createdAt?.toISOString() ?? new Date().toISOString(),
        updatedAt: d.updatedAt?.toISOString() ?? new Date().toISOString(),
        closingDate: d.closingDate ?? undefined,
        ndaSigned: d.ndaSigned,
        dataRoomAccess: d.dataRoomAccess,
        overview: d.overview,
        thesis: d.thesis,
        financials: d.financials ?? { arr: 0, nrr: 100, growth: 0, ebitda: 0 },
        synergies: (d.synergies as { type: string; value: string; confidence: string }[]) ?? [],
        contacts: (d.contacts as { name: string; role: string; email?: string }[]) ?? [],
        documents: (d.documents as { name: string; type: string; date: string; size: string }[]) ?? [],
        dueDiligenceItems: (d.dueDiligenceItems as Record<string, unknown>[]) ?? [],
        timeline: (d.timeline as Record<string, unknown>[]) ?? [],
      }));
    }
  } catch {}
  return null;
}

router.get("/deals", async (req, res) => {
  const query = GetDealsQueryParams.parse(req.query);
  const dbDeals = await getDeals();
  let filtered: typeof MOCK_DEALS = (dbDeals ?? MOCK_DEALS) as typeof MOCK_DEALS;

  if (query.stage) filtered = filtered.filter((d) => d.stage === query.stage);
  if (query.type) filtered = filtered.filter((d) => d.dealType === query.type);

  const data = GetDealsResponse.parse(filtered);
  res.json(data);
});

router.get("/deals/pipeline-summary", async (_req, res) => {
  const stages = ["sourcing", "nda", "due_diligence", "negotiation", "closing", "closed", "passed"] as const;
  const dbDeals = await getDeals();
  const list = dbDeals ?? MOCK_DEALS;

  const byStage = stages.map((stage) => {
    const stagDeals = list.filter((d) => d.stage === stage);
    return {
      stage,
      count: stagDeals.length,
      value: stagDeals.reduce((s, d) => s + d.dealSize, 0),
    };
  });

  const data = GetDealPipelineSummaryResponse.parse({
    totalDeals: list.length,
    totalValue: list.reduce((s, d) => s + d.dealSize, 0),
    byStage,
    avgTimeToClose: 4.2,
    dealsClosedThisYear: 1,
    valueClosedThisYear: 62000000,
  });
  res.json(data);
});

router.get("/deals/:id", async (req, res) => {
  const dbDeals = await getDeals();
  const list = dbDeals ?? MOCK_DEALS;
  const deal = list.find((d) => d.id === req.params.id) ?? list[0];
  const data = GetDealResponse.parse(deal);
  res.json(data);
});

export default router;
