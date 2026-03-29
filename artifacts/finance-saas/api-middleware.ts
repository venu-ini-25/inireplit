import { Pool } from "pg";
import { randomUUID } from "crypto";
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

async function parseBody(req: Connect.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk: Buffer) => { data += chunk.toString(); });
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); }
      catch { resolve({}); }
    });
    req.on("error", () => resolve({}));
  });
}

export function createApiMiddleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const rawUrl = req.url ?? "";
    const url = rawUrl.split("?")[0];
    const method = req.method ?? "GET";

    if (url.startsWith("/api/")) {
      console.log(`[API] ${method} ${rawUrl}`);
    }

    if (!url.startsWith("/api/")) return next();

    const send = (status: number, data: unknown) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify(data));
    };

    if (method === "OPTIONS") {
      res.writeHead(200, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS" });
      return res.end();
    }

    try {
      await ensureTable();
      const db = getDb();

      if (method === "GET" && url === "/api/access-requests") {
        const { rows } = await db.query(
          "SELECT * FROM access_requests ORDER BY submitted_at DESC"
        );
        return send(200, { requests: rows.map(rowToRequest), total: rows.length });
      }

      const statusMatch = url.match(/^\/api\/access-requests\/status\/(.+)$/);
      if (method === "GET" && statusMatch) {
        const email = decodeURIComponent(statusMatch[1]);
        const { rows } = await db.query(
          "SELECT id, status FROM access_requests WHERE email = $1 ORDER BY submitted_at DESC LIMIT 1",
          [email]
        );
        if (rows.length === 0) return send(200, { status: "not_found" });
        return send(200, { status: rows[0].status, id: rows[0].id });
      }

      if (method === "POST" && url === "/api/access-requests") {
        const body = await parseBody(req);
        const { firstName, lastName, email, company, role, aum, message } = body as Record<string, string>;
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

      const approveMatch = url.match(/^\/api\/access-requests\/([^/]+)\/approve$/);
      if (approveMatch && (method === "POST" || method === "PATCH" || method === "GET")) {
        const { rows } = await db.query(
          "UPDATE access_requests SET status='approved', reviewed_at=NOW() WHERE id=$1 RETURNING *",
          [approveMatch[1]]
        );
        if (rows.length === 0) return send(404, { error: "Request not found" });
        return send(200, rowToRequest(rows[0]));
      }

      const denyMatch = url.match(/^\/api\/access-requests\/([^/]+)\/deny$/);
      if (denyMatch && (method === "POST" || method === "PATCH" || method === "GET")) {
        const { rows } = await db.query(
          "UPDATE access_requests SET status='denied', reviewed_at=NOW() WHERE id=$1 RETURNING *",
          [denyMatch[1]]
        );
        if (rows.length === 0) return send(404, { error: "Request not found" });
        return send(200, rowToRequest(rows[0]));
      }

      return next();
    } catch (err) {
      console.error("[API]", err);
      return send(500, { error: "Internal server error" });
    }
  };
}
