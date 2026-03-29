import { Pool } from "pg";
import { randomUUID } from "crypto";
import http from "http";
import type { Connect } from "vite";

let pool: Pool | null = null;
let tableReady = false;

function getDb(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

async function ensureTable() {
  if (tableReady) return;
  const db = getDb();
  await db.query(`
    CREATE TABLE IF NOT EXISTS access_requests (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT DEFAULT '',
      role TEXT NOT NULL,
      aum TEXT DEFAULT '',
      message TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_access_requests_email ON access_requests(email);
    CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
  `);
  tableReady = true;
}

function rowToRequest(row: Record<string, unknown>) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    company: (row.company as string) ?? "",
    role: row.role,
    aum: (row.aum as string) ?? "",
    message: (row.message as string) ?? "",
    status: row.status,
    submittedAt: new Date(row.submitted_at as string).toISOString(),
    reviewedAt: row.reviewed_at
      ? new Date(row.reviewed_at as string).toISOString()
      : null,
  };
}

async function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    if (req.readableEnded) return resolve("");
    let data = "";
    req.on("data", (chunk: Buffer) => { data += chunk.toString(); });
    req.on("end", () => resolve(data));
    req.on("error", () => resolve(""));
  });
}

function parseQs(rawUrl: string): Record<string, string> {
  const i = rawUrl.indexOf("?");
  if (i === -1) return {};
  return Object.fromEntries(new URLSearchParams(rawUrl.slice(i + 1)));
}

export function createApiMiddleware(): Connect.NextHandleFunction {
  return (req, res, next) => {
    const rawUrl = req.url ?? "";
    const path = rawUrl.split("?")[0];
    const method = req.method ?? "GET";

    if (!path.startsWith("/api/")) return next();

    const send = (status: number, data: unknown) => {
      if (res.headersSent) return;
      const body = JSON.stringify(data);
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      });
      res.end(body);
    };

    if (method === "OPTIONS") {
      res.writeHead(200, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" });
      res.end();
      return;
    }

    // Run the actual async handler, catching all errors
    const handle = async () => {
      await ensureTable();
      const db = getDb();
      const qs = parseQs(rawUrl);

      // GET /api/access-requests — list all
      if (path === "/api/access-requests" && method === "GET") {
        const { rows } = await db.query(
          "SELECT * FROM access_requests ORDER BY submitted_at DESC"
        );
        return send(200, { requests: rows.map(rowToRequest), total: rows.length });
      }

      // GET /api/access-requests/status?email=xxx — check status for a specific email
      if (path === "/api/access-requests/status" && method === "GET") {
        const email = qs.email ?? "";
        const { rows } = await db.query(
          "SELECT id, status FROM access_requests WHERE email = $1 ORDER BY submitted_at DESC LIMIT 1",
          [email]
        );
        if (rows.length === 0) return send(200, { status: "not_found" });
        return send(200, { status: rows[0].status, id: rows[0].id });
      }

      // POST /api/access-requests — submit new request
      if (path === "/api/access-requests" && method === "POST") {
        const raw = await readBody(req);
        let body: Record<string, string> = {};
        try { body = JSON.parse(raw || "{}"); } catch { /* ignore */ }
        const { firstName, lastName, email, company, role, aum, message } = body;
        if (!firstName || !email || !role)
          return send(400, { error: "firstName, email and role are required" });

        const { rows: existing } = await db.query(
          "SELECT id, status FROM access_requests WHERE email = $1 AND status = 'pending'",
          [email]
        );
        if (existing.length > 0)
          return send(200, { id: existing[0].id, status: existing[0].status, message: "Request already submitted" });

        const id = `req_${randomUUID().slice(0, 8)}`;
        const { rows } = await db.query(
          `INSERT INTO access_requests (id, first_name, last_name, email, company, role, aum, message, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING *`,
          [id, firstName ?? "", lastName ?? "", email, company ?? "", role, aum ?? "", message ?? ""]
        );
        return send(201, rowToRequest(rows[0]));
      }

      // GET /api/admin?id=xxx&action=approve|deny|revoke — admin actions via flat URL
      if (path === "/api/admin" && method === "GET") {
        const { id, action } = qs;
        if (!id || !action) return send(400, { error: "id and action are required" });

        let newStatus: string;
        if (action === "approve") newStatus = "approved";
        else if (action === "deny") newStatus = "denied";
        else if (action === "revoke") newStatus = "pending";
        else return send(400, { error: `Unknown action: ${action}` });

        const { rows } = await db.query(
          "UPDATE access_requests SET status=$1, reviewed_at=NOW() WHERE id=$2 RETURNING *",
          [newStatus, id]
        );
        if (rows.length === 0) return send(404, { error: "Request not found" });
        return send(200, rowToRequest(rows[0]));
      }

      return proxyToApiServer(req, res, rawUrl);
    };

    handle().catch((err) => {
      console.error("[API]", err);
      send(500, { error: "Internal server error" });
    });
  };
}

function proxyToApiServer(
  req: Connect.IncomingMessage,
  res: import("http").ServerResponse,
  rawUrl: string,
): void {
  const apiPort = 8080;
  const options: http.RequestOptions = {
    hostname: "localhost",
    port: apiPort,
    path: rawUrl,
    method: req.method ?? "GET",
    headers: { ...req.headers, host: `localhost:${apiPort}` },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    if (res.headersSent) return;
    res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers as import("http").OutgoingHttpHeaders);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "API server unavailable" }));
    }
  });

  req.pipe(proxyReq, { end: true });
}
