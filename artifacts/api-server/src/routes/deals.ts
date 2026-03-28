import { Router, type IRouter } from "express";
import {
  GetDealsResponse,
  GetDealResponse,
  GetDealPipelineSummaryResponse,
  GetDealsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const DEALS_DATA = [
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
  },
  {
    id: "deal_006",
    companyName: "PulseHealth",
    industry: "HealthTech",
    dealType: "acquisition",
    stage: "passed",
    dealSize: 35000000,
    valuation: 42000000,
    targetRevenue: 5800000,
    assignedTo: "Marcus Williams",
    priority: "low",
    createdAt: "2024-09-12T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
    ndaSigned: true,
    dataRoomAccess: false,
  },
  {
    id: "deal_007",
    companyName: "NexGen Manufacturing",
    industry: "Manufacturing Tech",
    dealType: "acquisition",
    stage: "closed",
    dealSize: 62000000,
    valuation: 71000000,
    targetRevenue: 11200000,
    assignedTo: "Priya Nair",
    priority: "high",
    createdAt: "2024-06-01T00:00:00Z",
    updatedAt: "2024-12-20T00:00:00Z",
    closingDate: "2024-12-15T00:00:00Z",
    ndaSigned: true,
    dataRoomAccess: true,
  },
];

router.get("/deals", (req, res) => {
  const query = GetDealsQueryParams.parse(req.query);
  let filtered = DEALS_DATA;

  if (query.stage) filtered = filtered.filter((d) => d.stage === query.stage);
  if (query.type) filtered = filtered.filter((d) => d.dealType === query.type);

  const data = GetDealsResponse.parse(filtered);
  res.json(data);
});

router.get("/deals/pipeline-summary", (_req, res) => {
  const stages = ["sourcing", "nda", "due_diligence", "negotiation", "closing", "closed", "passed"] as const;

  const byStage = stages.map((stage) => {
    const deals = DEALS_DATA.filter((d) => d.stage === stage);
    return {
      stage,
      count: deals.length,
      value: deals.reduce((s, d) => s + d.dealSize, 0),
    };
  });

  const activeDeals = DEALS_DATA.filter((d) => d.stage !== "passed" && d.stage !== "closed");

  const data = GetDealPipelineSummaryResponse.parse({
    totalDeals: DEALS_DATA.length,
    totalValue: DEALS_DATA.reduce((s, d) => s + d.dealSize, 0),
    byStage,
    avgTimeToClose: 4.2,
    dealsClosedThisYear: 1,
    valueClosedThisYear: 62000000,
  });
  res.json(data);
});

router.get("/deals/:id", (req, res) => {
  const deal = DEALS_DATA.find((d) => d.id === req.params.id) || DEALS_DATA[0];

  const data = GetDealResponse.parse({
    ...deal,
    dueDiligenceItems: [
      { category: "Financial", item: "Audited financials (3 years)", status: "completed", assignedTo: "Sarah Chen", dueDate: "2025-04-01T00:00:00Z" },
      { category: "Financial", item: "Management accounts YTD", status: "completed", assignedTo: "Sarah Chen", dueDate: "2025-04-01T00:00:00Z" },
      { category: "Financial", item: "Revenue cohort analysis", status: "in_progress", assignedTo: "Analyst Team", dueDate: "2025-04-15T00:00:00Z" },
      { category: "Legal", item: "Cap table & shareholder agreements", status: "completed", assignedTo: "Legal Team", dueDate: "2025-03-20T00:00:00Z" },
      { category: "Legal", item: "IP assignments and patents", status: "in_progress", assignedTo: "Legal Team", dueDate: "2025-04-20T00:00:00Z" },
      { category: "Legal", item: "Material contracts review", status: "pending", assignedTo: "Legal Team", dueDate: "2025-05-01T00:00:00Z" },
      { category: "Technology", item: "Technical architecture review", status: "in_progress", assignedTo: "Tech Advisor", dueDate: "2025-04-10T00:00:00Z" },
      { category: "Technology", item: "Security audit", status: "pending", assignedTo: "Tech Advisor", dueDate: "2025-04-25T00:00:00Z" },
      { category: "Commercial", item: "Customer reference calls", status: "in_progress", assignedTo: "Marcus Williams", dueDate: "2025-04-12T00:00:00Z" },
      { category: "Commercial", item: "Pipeline & backlog analysis", status: "flagged", assignedTo: "Analyst Team", dueDate: "2025-04-08T00:00:00Z" },
      { category: "HR", item: "Org chart and key personnel", status: "completed", assignedTo: "HR Lead", dueDate: "2025-03-25T00:00:00Z" },
      { category: "HR", item: "Compensation benchmarking", status: "pending", assignedTo: "HR Lead", dueDate: "2025-05-05T00:00:00Z" },
    ],
    timeline: [
      { date: "2025-01-15T00:00:00Z", event: "Deal Sourced", description: "Initial identification via network referral", type: "milestone" },
      { date: "2025-01-28T00:00:00Z", event: "Initial Review Complete", description: "Passed initial screening – strong growth profile", type: "milestone" },
      { date: "2025-02-05T00:00:00Z", event: "NDA Signed", description: "Mutual NDA executed via iNi platform", type: "document" },
      { date: "2025-02-12T00:00:00Z", event: "Management Meeting", description: "Intro call with CEO and CFO", type: "meeting" },
      { date: "2025-02-20T00:00:00Z", event: "Data Room Access Granted", description: "Full data room opened post-NDA", type: "milestone" },
      { date: "2025-03-01T00:00:00Z", event: "Due Diligence Started", description: "Financial, legal, and tech workstreams initiated", type: "milestone" },
      { date: "2025-03-15T00:00:00Z", event: "Preliminary LOI Sent", description: "Non-binding letter of intent submitted", type: "document" },
      { date: "2025-03-20T00:00:00Z", event: "Status Update", description: "60% of diligence items completed", type: "update" },
    ],
  });
  res.json(data);
});

export default router;
