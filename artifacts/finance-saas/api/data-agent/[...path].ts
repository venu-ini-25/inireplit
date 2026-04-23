import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, err, extractPath } from "../_utils.js";

function toKey(s: string) { return s.toLowerCase().replace(/[\s_\-.]+/g, "").trim(); }

const DB_SCHEMAS = {
  companies: { fields: ["company_name","industry","stage","revenue","valuation","growth_rate","employees","location","status","ownership","arr","moic","irr","founded"], required: ["company_name"], description: "Portfolio companies — feeds Portfolio & Executive Summary dashboards" },
  deals: { fields: ["company_name","deal_type","deal_size","stage","closing_date","valuation","target_revenue","industry","assigned_to","priority","overview"], required: ["company_name"], description: "M&A deals & investment pipeline — feeds M&A Support dashboard" },
  financials: { fields: ["period","revenue","expenses","ebitda","arr"], required: ["period"], description: "Monthly P&L snapshots — feeds Finance P&L, Cash Flow, Expenses & Executive Summary dashboards" },
  metrics: { fields: ["metric_key","metric_label","category","value","unit","period"], required: ["metric_key"], description: "KPI metrics — feeds Operations, Product, Marketing, Sales, People, Cash Flow & Reports dashboards" },
};

function detectTableType(headers: string[]): string {
  const h = headers.map(toKey);
  if (h.some((x) => ["valuation","moic","irr","ownership"].includes(x))) return "companies";
  if (h.some((x) => ["dealsize","dealname","closingdate","dealtype"].includes(x))) return "deals";
  if (h.some((x) => ["revenue","expenses","ebitda"].includes(x)) && h.includes("period")) return "financials";
  if (h.some((x) => ["metrickey"].includes(x))) return "metrics";
  if (h.includes("period") && h.some((x) => ["revenue","expenses","arr","ebitda"].includes(x))) return "financials";
  if (h.includes("company") || h.includes("companyname")) return "companies";
  if (h.includes("industry") || h.includes("stage")) return "companies";
  return "unknown";
}

function autoMatch(headers: string[], tableType: string): Record<string, string> {
  const schema = DB_SCHEMAS[tableType as keyof typeof DB_SCHEMAS];
  if (!schema) return {};
  const mapping: Record<string, string> = {};
  for (const raw of headers) {
    const k = toKey(raw);
    const norm = raw.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const match = schema.fields.find((f) => toKey(f) === k || f === norm);
    if (match) mapping[raw] = match;
  }
  return mapping;
}

function detectIssues(headers: string[], tableType: string, sampleRows: Record<string, string>[]): string[] {
  const issues: string[] = [];
  const schema = DB_SCHEMAS[tableType as keyof typeof DB_SCHEMAS];
  if (!schema) { issues.push("Could not determine data type — please select manually."); return issues; }
  for (const req of schema.required) {
    const matched = headers.find((h) => toKey(h) === toKey(req) || h.toLowerCase().replace(/\s+/g, "_") === req);
    if (!matched && !sampleRows[0]?.[req]) issues.push(`Required field "${req}" not found in source data.`);
  }
  if (sampleRows.length > 0 && headers.length > 20) issues.push("Large number of columns detected — unmapped columns will be skipped.");
  return issues;
}

function getAiConfig(): { apiKey: string; baseUrl: string; model: string } | null {
  if (process.env.GOOGLE_API_KEY) {
    return { apiKey: process.env.GOOGLE_API_KEY, baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.0-flash" };
  }
  const openaiKey = process.env.OPENAI_API_KEY ?? process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (openaiKey) {
    const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    return { apiKey: openaiKey, baseUrl, model: "gpt-4o-mini" };
  }
  return null;
}

async function callAI(messages: { role: string; content: string }[], stream: boolean): Promise<Response | null> {
  const config = getAiConfig();
  if (!config) return null;
  try {
    return await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model: config.model, messages, max_tokens: 2048, stream }),
      signal: AbortSignal.timeout(25000),
    });
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") { err(res, "Method not allowed", 405); return; }

  const pathParts = extractPath(req, "/api/data-agent");
  const sub = pathParts[0] ?? "";

  // POST /api/data-agent/analyze
  if (sub === "analyze") {
    const { headers = [], sampleRows = [], tableTypeHint } = req.body as { headers?: string[]; sampleRows?: Record<string, string>[]; tableTypeHint?: string };
    if (!Array.isArray(headers) || headers.length === 0) { err(res, "headers array required"); return; }
    const cleanHeaders = headers.filter(h => h.trim() !== "");
    const detectedType = tableTypeHint && tableTypeHint !== "unknown" ? tableTypeHint : detectTableType(cleanHeaders);
    const suggestedMapping = autoMatch(cleanHeaders, detectedType);
    const issues = detectIssues(cleanHeaders, detectedType, sampleRows);

    if (getAiConfig()) {
      try {
        const schemaContext = Object.entries(DB_SCHEMAS).map(([t, s]) => `${t}: ${s.description}\n  Fields: ${s.fields.join(", ")}`).join("\n\n");
        const sampleText = sampleRows.slice(0, 5).map((row, i) => `Row ${i + 1}: ${Object.entries(row).slice(0, 10).map(([k, v]) => `${k}="${v}"`).join(", ")}`).join("\n");
        const prompt = `You are a financial data intelligence expert for a PE/VC finance SaaS platform.\nAnalyze this uploaded CSV data and return a JSON report.\n\nDatabase schemas:\n${schemaContext}\n\nHeaders (${cleanHeaders.length} columns): ${cleanHeaders.join(", ")}\n\nSample data:\n${sampleText}\n\n${tableTypeHint ? `User hint: "${tableTypeHint}"` : ""}\n\nRespond with this EXACT JSON structure (no markdown, no code fences):\n{\n  "sourceSystem": "<e.g. quickbooks, hubspot, excel_manual, gusto, stripe, unknown>",\n  "sourceName": "<human-readable name, e.g. 'QuickBooks P&L Export'>",\n  "dataLevel": "transaction"|"summary"|"mixed",\n  "dataLevelExplanation": "<1 sentence>",\n  "detectedTableType": "companies"|"deals"|"financials"|"metrics",\n  "targetTables": ["<DB tables this data populates>"],\n  "dashboardsImpacted": ["<dashboard names>"],\n  "confidence": <0-100>,\n  "detectionReason": "<2-3 sentences>",\n  "transformationPlan": [{ "id": "<id>", "label": "<short title>", "description": "<what it does>", "priority": <1-10>, "required": <true|false> }],\n  "mappings": [{ "sourceColumn": "<exact CSV header>", "targetField": "<db field or null>", "confidence": <0-100>, "reason": "<max 10 words>", "skip": <true if should not import> }],\n  "qualityIssues": [{ "column": "<col>", "issue": "<desc>", "recommendation": "<fix>", "severity": "high"|"medium"|"low" }],\n  "summary": "<3-4 sentences about this data>"\n}\nMap EVERY column. Return raw JSON only.`;
        const aiRes = await callAI([
          { role: "system", content: "You are a financial data expert. Respond with valid JSON only — no markdown, no code fences." },
          { role: "user", content: prompt },
        ], false);
        if (aiRes?.ok) {
          const data = await aiRes.json() as { choices?: { message?: { content?: string } }[] };
          const raw = data.choices?.[0]?.message?.content ?? "";
          const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)```/);
          const jsonStr = fenced ? fenced[1].trim() : raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
          const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
          res.status(200).json({ success: true, ...parsed }); return;
        }
      } catch {}
    }

    // Rule-based fallback — returns exact same field names as AiAnalysis interface
    const schema = DB_SCHEMAS[detectedType as keyof typeof DB_SCHEMAS];
    const dashboardMap: Record<string, string[]> = {
      companies: ["Portfolio", "Executive Summary"],
      deals: ["M&A Support", "Sales"],
      financials: ["Finance P&L", "Cash Flow", "Expenses", "Executive Summary"],
      metrics: ["Operations", "Product", "Marketing", "Sales", "People"],
    };
    const mappings = cleanHeaders.map(h => ({
      sourceColumn: h,
      targetField: suggestedMapping[h] ?? null,
      confidence: suggestedMapping[h] ? 85 : 0,
      reason: suggestedMapping[h] ? "Column name matches DB field" : "No matching field found",
      skip: !suggestedMapping[h],
    }));
    res.status(200).json({
      success: true,
      sourceSystem: "excel_manual",
      sourceName: detectedType !== "unknown" ? `${detectedType.charAt(0).toUpperCase() + detectedType.slice(1)} Data` : "Unknown Data Source",
      dataLevel: "summary" as const,
      dataLevelExplanation: schema ? `Detected as ${schema.description}` : "File type could not be determined automatically.",
      detectedTableType: detectedType,
      targetTables: detectedType !== "unknown" ? [detectedType] : [],
      dashboardsImpacted: dashboardMap[detectedType] ?? [],
      confidence: detectedType !== "unknown" ? 70 : 20,
      detectionReason: detectedType !== "unknown"
        ? `Headers match the "${detectedType}" table schema. AI analysis unavailable — using rule-based detection.`
        : "Could not determine data type from headers. Please select the data type manually.",
      transformationPlan: [],
      mappings,
      qualityIssues: issues.map(issue => ({ column: "", issue, recommendation: "Review column mapping", severity: "medium" as const })),
      summary: schema
        ? `This appears to be ${schema.description}. ${mappings.filter(m => !m.skip).length} of ${cleanHeaders.length} columns were automatically mapped. Review the mapping below and adjust before importing.`
        : `Data type could not be automatically detected. Please select the correct type and review column mappings before importing.`,
    });
  }

  // POST /api/data-agent/transform
  else if (sub === "transform") {
    const { rows = [], tableType = "unknown", columnMapping = {} } = req.body as { rows?: Record<string, string>[]; tableType?: string; columnMapping?: Record<string, string> };
    const mapped = rows.map((row) => {
      const out: Record<string, string> = {};
      for (const [rawKey, val] of Object.entries(row)) {
        const mappedKey = columnMapping[rawKey] ?? rawKey;
        out[mappedKey] = val;
      }
      return out;
    });
    res.status(200).json({ transformed: mapped, tableType, rowCount: mapped.length });
  }

  // POST /api/data-agent/chat
  else if (sub === "chat") {
    const { message = "", history = [], analysisContext } = req.body as { message?: string; history?: { role: string; content: string }[]; analysisContext?: Record<string, unknown> };
    if (!message.trim()) { err(res, "message is required"); return; }

    if (!getAiConfig()) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      const fallback = `I'm a financial data mapping assistant. AI is not yet configured for this deployment. To enable it, add a GOOGLE_API_KEY (free at aistudio.google.com) to the Vercel environment variables. In the meantime, ${analysisContext?.detectedTableType && analysisContext.detectedTableType !== "unknown" ? `your data looks like "${analysisContext.detectedTableType}" — you can review the auto-mapped columns below and adjust any before importing.` : "you can manually select the data type and adjust the column mappings before importing."}`;
      res.write(`data: ${JSON.stringify({ content: fallback })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, fullContent: fallback })}\n\n`);
      res.end(); return;
    }

    const systemPrompt = `You are an expert financial data mapping assistant for a PE/VC SaaS platform (iNi — Invent N Invest). You help users understand and adjust how their CSV/Excel data maps to the platform's database schemas.
${analysisContext ? `\nCurrent file context: ${JSON.stringify(analysisContext)}` : ""}

Available database tables: companies, deals, financials, metrics.
You can suggest mapping changes using JSON action blocks:
\`\`\`json
{"action":"update_mapping","source":"columnName","target":"dbFieldName"}
\`\`\`
Be specific, concise, and knowledgeable about financial data.`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const aiRes = await callAI([{ role: "system", content: systemPrompt }, ...history.slice(-6), { role: "user", content: message }], true);
      if (!aiRes?.ok) throw new Error("AI request failed");
      const reader = aiRes.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let fullContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) { fullContent += delta; res.write(`data: ${JSON.stringify({ content: delta })}\n\n`); }
          } catch {}
        }
      }
      res.write(`data: ${JSON.stringify({ done: true, fullContent })}\n\n`);
    } catch (e) {
      res.write(`data: ${JSON.stringify({ error: (e as Error).message })}\n\n`);
    }
    res.end();
  }

  else {
    err(res, "Not found", 404);
  }
}
