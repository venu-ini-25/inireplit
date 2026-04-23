import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "dummy",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Extract raw JSON from model output (strips markdown code fences if present)
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)```/);
  if (fenced) return fenced[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) return raw.slice(start, end + 1);
  return raw.trim();
}

// ─── Schema & Taxonomy ───────────────────────────────────────────────────────

const DB_SCHEMAS = {
  companies: {
    fields: ["company_name","industry","stage","revenue","valuation","growth_rate","employees","location","status","ownership","arr","moic","irr","founded"],
    required: ["company_name"],
    description: "Portfolio companies — feeds Portfolio & Executive Summary dashboards",
  },
  deals: {
    fields: ["company_name","deal_type","deal_size","stage","closing_date","valuation","target_revenue","industry","assigned_to","priority","overview"],
    required: ["company_name"],
    description: "M&A deals & investment pipeline — feeds M&A Support dashboard",
  },
  financials: {
    fields: ["period","revenue","expenses","ebitda","arr"],
    required: ["period"],
    description: "Monthly P&L snapshots — feeds Finance P&L, Cash Flow, Expenses & Executive Summary dashboards",
  },
  metrics: {
    fields: ["metric_key","metric_label","category","value","unit","period"],
    required: ["metric_key"],
    description: "KPI metrics — feeds Operations, Product, Marketing, Sales, People, Cash Flow & Reports dashboards",
  },
};

const METRICS_CATEGORIES = `
Operations: headcount, burn_rate, runway, gross_margin, cac, ltv, payback_period
Product:    dau, mau, nps, churn_rate, logo_churn, dau_mau_ratio, adoption_rate
Marketing:  mqls, blended_cac, marketing_pipeline, campaign_roi, leads_by_channel
Sales:      arr, new_arr, churn_arr, expansion_arr, avg_deal_size, quota_attainment, win_rate, pipeline_value
People:     total_headcount, attrition_rate, avg_tenure, open_roles, headcount_by_dept, comp_total
Cashflow:   cash_inflows, cash_outflows, net_cash, cash_on_hand, operating_cf, investing_cf, financing_cf
Spending:   spend_by_category, spend_by_dept, total_spend`;

const DASHBOARDS = [
  "Executive Summary","Finance P&L","Cash Flow","Expenses",
  "Operations","Product","Marketing","Sales","People",
  "Portfolio","M&A Support","Reports & Analytics","Professional Services",
];

const SOURCE_SYSTEMS = `
erp_quickbooks_gl       — QuickBooks General Ledger transactions (Account, Type/Class, Debit, Credit, Date, Memo)
erp_quickbooks_pl       — QuickBooks P&L report (wide format: months as columns, account rows)
erp_quickbooks_generic  — Other QuickBooks exports (Invoice, AR, Vendor Bills)
erp_netsuite            — NetSuite financial exports
erp_generic             — Other ERP / accounting system exports
crm_hubspot_deals       — HubSpot deal pipeline (Deal Name, Stage, Amount, Close Date, Owner)
crm_hubspot_contacts    — HubSpot contacts / MQL data (Email, Company, Source, Lifecycle Stage)
crm_hubspot_companies   — HubSpot company records
crm_salesforce_opps     — Salesforce opportunities (Account, Stage, ARR/Amount, Owner)
crm_salesforce_leads    — Salesforce leads / contacts
crm_generic             — Other CRM exports
hr_gusto                — Gusto payroll (Employee, Department, Salary, Start Date, Status)
hr_generic              — Other HR / payroll exports
bank_statement          — Bank transaction records (Date, Description, Amount, Balance)
portfolio_companies     — Portfolio company spreadsheet (Name, ARR, Growth, Valuation, Stage)
deals_pipeline          — M&A pipeline spreadsheet
pl_summary              — Already-summarized P&L (period, revenue, expenses, ebitda rows)
metrics_generic         — KPI / metrics exports
unknown                 — Cannot determine source`;

const TRANSFORMATIONS = `
aggregate_gl_to_pl      — Roll up GL journal entries → monthly P&L (group by period, classify account types, sum)
map_gl_account_types    — Classify GL accounts: Income→revenue, COGS→cogs, Expense→opex, Other→skip
pivot_wide_to_long      — Convert wide P&L (months as columns) to long (one period row per month)
normalize_currency      — Strip $, commas, parentheses for negatives; convert to numbers
parse_dates             — Standardize date formats → YYYY-MM-DD or "Mon YYYY" period labels
aggregate_crm_to_pipeline — Group CRM records → deal counts and values by stage
map_crm_stages          — Map source CRM stages → standard stages (sourcing/term_sheet/due_diligence/loi/closed)
aggregate_crm_to_metrics  — Roll up CRM contact/lead records → MQL counts, pipeline by channel
aggregate_hr_to_metrics   — Roll up HR records → headcount/comp summary by department
aggregate_bank_to_cashflow — Categorize & sum bank transactions → monthly inflow/outflow metrics
extract_period_from_date  — Generate period_label ("Jan 2025") from transaction date column
clean_percentages         — Convert "81.4%" strings → numeric 81.4
compute_ebitda            — Calculate EBITDA = Revenue − Expenses when not present
deduplicate_rows          — Remove exact duplicate records`;

// ─── /analyze ───────────────────────────────────────────────────────────────

router.post("/data-agent/analyze", async (req, res) => {
  try {
    const { headers, sampleRows, tableTypeHint } = req.body as {
      headers: string[];
      sampleRows: Record<string, string>[];
      tableTypeHint?: string;
    };

    if (!Array.isArray(headers) || headers.length === 0) {
      res.status(400).json({ error: "headers array required" });
      return;
    }

    // Strip empty / whitespace-only column headers (produced when CSV rows have
    // trailing commas or unquoted commas in values — XLSX pads shorter header row)
    const cleanHeaders = headers.filter(h => h.trim() !== "");
    const cleanSampleRows = sampleRows.map(row => {
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        if (k.trim() !== "") cleaned[k] = v;
      }
      return cleaned;
    });

    const schemaContext = Object.entries(DB_SCHEMAS)
      .map(([t, s]) => `${t}: ${s.description}\n  Fields: ${s.fields.join(", ")}\n  Required: ${s.required.join(", ")}`)
      .join("\n\n");

    const sampleText = cleanSampleRows.slice(0, 8).map((row, i) =>
      `Row ${i + 1}: ${Object.entries(row).slice(0, 12).map(([k, v]) => `${k}="${v}"`).join(", ")}`
    ).join("\n");

    const prompt = `You are a financial data intelligence expert for a PE/VC finance SaaS platform.
Analyze this uploaded CSV/Excel data file and produce a complete intelligence report with transformation plan.

PLATFORM DASHBOARDS (${DASHBOARDS.length} total):
${DASHBOARDS.join(", ")}

DATABASE TABLES (data ultimately lands here):
${schemaContext}

METRICS CATEGORIES (for metrics table):
${METRICS_CATEGORIES}

SOURCE SYSTEMS TO DETECT:
${SOURCE_SYSTEMS}

AVAILABLE TRANSFORMATIONS:
${TRANSFORMATIONS}

━━━ UPLOADED DATA ━━━
HEADERS (${cleanHeaders.length} columns): ${cleanHeaders.join(", ")}

SAMPLE DATA (${cleanSampleRows.length} rows shown):
${sampleText}

${tableTypeHint ? `USER HINT: "${tableTypeHint}"` : ""}
━━━━━━━━━━━━━━━━━━━━━

Respond with this EXACT JSON structure:
{
  "sourceSystem": "<one of the source system IDs above>",
  "sourceName": "<human-readable name, e.g. 'QuickBooks General Ledger Export' or 'HubSpot Deal Pipeline'>",
  "dataLevel": "transaction"|"summary"|"mixed",
  "dataLevelExplanation": "<1 sentence: why this level, e.g. 'Each row is a GL journal entry that must be aggregated by period'>",
  "detectedTableType": "companies"|"deals"|"financials"|"metrics",
  "targetTables": ["<list of DB tables this data will populate, may be multiple>"],
  "dashboardsImpacted": ["<list of dashboard names from the 13 above that this data will improve>"],
  "confidence": <0-100>,
  "detectionReason": "<2-3 sentences explaining the detection>",
  "transformationPlan": [
    {
      "id": "<transformation id from list above>",
      "label": "<short title>",
      "description": "<what this step does to the data, 1-2 sentences>",
      "priority": <1-10, lower = runs first>,
      "required": <true if data cannot be imported without this step>
    }
  ],
  "mappings": [
    {
      "sourceColumn": "<exact header from CSV>",
      "targetField": "<target DB field or null>",
      "confidence": <0-100>,
      "reason": "<max 12 words>",
      "skip": <true if this column should not be imported>
    }
  ],
  "qualityIssues": [
    {
      "column": "<column name>",
      "issue": "<description>",
      "recommendation": "<how to fix>",
      "severity": "high"|"medium"|"low"
    }
  ],
  "summary": "<3-4 sentences: what the data is, what it will feed, what transformations are needed, overall quality>"
}

Rules:
- Map EVERY column (either to a target field or skip:true)
- For GL transaction data: targetTables should include "financials", transformationPlan must include aggregate_gl_to_pl and map_gl_account_types
- For wide-format P&L: transformationPlan must include pivot_wide_to_long
- For CRM deal data: targetTables should include "deals" or "metrics"
- For HR data: targetTables = ["metrics"], detectedTableType = "metrics"
- dashboardsImpacted should be specific and accurate based on what data this contains
- Be specific about GL account classification in the transformation descriptions`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: "You are a financial data intelligence expert. Respond with valid JSON only — no markdown, no code fences, no explanation. Output the raw JSON object directly." },
        { role: "user", content: prompt },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    let analysis: Record<string, unknown>;
    try { analysis = JSON.parse(extractJson(raw)); }
    catch { analysis = { error: "Could not parse AI response", raw }; }

    res.json({ success: true, ...analysis });
  } catch (err) {
    console.error("[data-agent/analyze] error:", err);
    res.status(500).json({ error: "Analysis failed", message: (err as Error).message });
  }
});

// ─── /transform (preview cleaned data) ──────────────────────────────────────

router.post("/data-agent/transform", async (req, res) => {
  try {
    const { headers, sampleRows, sourceSystem, transformationPlan, targetTableType, columnMapping } = req.body as {
      headers: string[];
      sampleRows: Record<string, string>[];
      sourceSystem: string;
      transformationPlan: { id: string; label: string; description: string }[];
      targetTableType: string;
      columnMapping?: Record<string, string>;
    };

    if (!Array.isArray(sampleRows) || sampleRows.length === 0) {
      res.status(400).json({ error: "sampleRows required" });
      return;
    }

    const targetSchema = DB_SCHEMAS[targetTableType as keyof typeof DB_SCHEMAS];
    const transformSteps = (transformationPlan ?? []).map(t => `• ${t.label}: ${t.description}`).join("\n");
    const sampleText = sampleRows.slice(0, 15).map((row, i) =>
      `Row ${i + 1}: ${Object.entries(row).slice(0, 12).map(([k, v]) => `${k}="${v}"`).join(", ")}`
    ).join("\n");

    const mappingHint = columnMapping && Object.keys(columnMapping).length > 0
      ? `\nUser-confirmed mappings: ${Object.entries(columnMapping).map(([s, t]) => `${s}→${t}`).join(", ")}`
      : "";

    const metricsHint = targetTableType === "metrics"
      ? `\nFor metrics output use: { metric_key, metric_label, category, value, unit, period }\nCategories: ${METRICS_CATEGORIES}`
      : "";

    const prompt = `You are a financial data transformation engine. Apply the transformation plan to produce clean, import-ready data.

SOURCE: ${sourceSystem}
TARGET TABLE: ${targetTableType}
${targetSchema ? `TARGET FIELDS: ${targetSchema.fields.join(", ")}` : ""}${metricsHint}

TRANSFORMATION PLAN TO APPLY:
${transformSteps || "No transformations — direct mapping only"}
${mappingHint}

RAW SOURCE DATA (${sampleRows.length} rows):
Headers: ${headers.join(", ")}
${sampleText}

INSTRUCTIONS:
1. Apply all transformation steps to the raw data
2. For GL data: group by period (month), classify accounts, compute revenue/expenses/ebitda
3. For wide P&L: pivot so each period becomes a separate row
4. For CRM deals: normalize stages, clean currency amounts
5. For HR data: aggregate by department into metrics rows
6. For bank transactions: categorize and aggregate by month
7. Clean all currency (remove $, commas), normalize dates to "Mon YYYY" format for periods
8. If computing EBITDA: ebitda = revenue - expenses
9. Output only rows that have values for required fields
10. For metrics table: produce multiple metric rows (one per KPI per period)

Respond with this JSON:
{
  "transformedRows": [
    { <target field names and clean values> }
  ],
  "transformationLog": [
    "<one sentence per transformation step actually applied, e.g. 'Grouped 47 GL entries into 4 monthly periods'>",
    "<e.g. 'Classified 12 Revenue accounts, 8 COGS accounts, 18 OpEx accounts'>",
    "<e.g. 'Stripped $ and commas from 3 currency columns'>"
  ],
  "rowsIn": <number of input rows>,
  "rowsOut": <number of output rows>,
  "warnings": ["<any data issues found during transformation>"],
  "summary": "<1-2 sentences describing what was produced>"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: "You are a financial data transformation engine. Respond with valid JSON only — no markdown, no code fences, no explanation. Output the raw JSON object directly." },
        { role: "user", content: prompt },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    let result: Record<string, unknown>;
    try { result = JSON.parse(extractJson(raw)); }
    catch { result = { error: "Could not parse transform response", raw }; }

    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[data-agent/transform] error:", err);
    res.status(500).json({ error: "Transform failed", message: (err as Error).message });
  }
});

// ─── /chat ───────────────────────────────────────────────────────────────────

router.post("/data-agent/chat", async (req, res) => {
  try {
    const { message, context, history } = req.body as {
      message: string;
      context: {
        headers: string[];
        currentMappings: Record<string, string | null>;
        tableType: string;
        sourceSystem?: string;
        sourceName?: string;
        dataLevel?: string;
        transformationPlan?: { id: string; label: string }[];
        dashboardsImpacted?: string[];
        qualityIssues?: unknown[];
      };
      history?: { role: "user" | "assistant"; content: string }[];
    };

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const schemaFields = DB_SCHEMAS[context.tableType as keyof typeof DB_SCHEMAS]?.fields ?? [];
    const mappingText = Object.entries(context.currentMappings)
      .map(([src, tgt]) => `  "${src}" → ${tgt ?? "(skip)"}`)
      .join("\n");

    const transformContext = context.transformationPlan?.length
      ? `\nTransformation plan: ${context.transformationPlan.map(t => t.label).join(", ")}`
      : "";

    const dashboardContext = context.dashboardsImpacted?.length
      ? `\nDashboards this data will feed: ${context.dashboardsImpacted.join(", ")}`
      : "";

    const systemPrompt = `You are the iNi Finance Platform Data Agent — an expert at understanding financial data from any source system and helping users prepare it for import.

You have full knowledge of this platform's data model and what feeds each dashboard.

SOURCE: ${context.sourceName ?? context.sourceSystem ?? "Unknown"} (${context.dataLevel ?? "unknown"} level)
TARGET TABLE: ${context.tableType}
AVAILABLE TARGET FIELDS: ${schemaFields.join(", ")}
CSV HEADERS: ${context.headers.join(", ")}${transformContext}${dashboardContext}

CURRENT MAPPINGS:
${mappingText}

${METRICS_CATEGORIES}

You can help with:
1. Adjusting field mappings (tell the user what changed)
2. Explaining what specific transformations do
3. Answering data quality questions
4. Explaining how the imported data will appear in specific dashboards
5. Recommending which columns to skip or include

When changing a mapping, output a JSON action block (the app parses these):
\`\`\`json
{"action":"update_mapping","source":"sourceColumnName","target":"targetFieldName"}
\`\`\`
To skip:
\`\`\`json
{"action":"skip","source":"sourceColumnName"}
\`\`\`

Be specific, concise, and knowledgeable about financial data. If asked about GL account types, explain the classification logic. If asked about dashboard impact, be specific about which charts/metrics will update.`;

    const messages: { role: "user" | "assistant" | "system"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...(history ?? []).slice(-6),
      { role: "user", content: message },
    ];

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 2048,
      messages,
      stream: true,
    });

    let fullContent = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, fullContent })}\n\n`);
    res.end();
  } catch (err) {
    console.error("[data-agent/chat] error:", err);
    res.write(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`);
    res.end();
  }
});

export default router;
