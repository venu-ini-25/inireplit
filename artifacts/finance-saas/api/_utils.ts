import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";
import { verifyToken } from "@clerk/backend";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

let pool: Pool | null = null;
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pool;
}

export function cors(res: VercelResponse): void {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
}

export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  cors(res);
  if (req.method === "OPTIONS") { res.status(200).end(); return true; }
  return false;
}

export function ok<T>(res: VercelResponse, data: T): void {
  cors(res);
  res.status(200).json(data);
}

export function err(res: VercelResponse, message: string, status = 400): void {
  cors(res);
  res.status(status).json({ error: message });
}

function getAdminEmails(): string[] {
  const env = process.env.ADMIN_EMAILS;
  if (env) return env.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return ["venu.vegi@inventninvest.com"];
}

async function verifyJwt(token: string, secret: string): Promise<{ email?: string; role?: string } | null> {
  try {
    const [headerB64, payloadB64, sigB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !sigB64) return null;
    const { createHmac } = await import("crypto");
    const signingInput = `${headerB64}.${payloadB64}`;
    const expected = createHmac("sha256", secret).update(signingInput).digest("base64url");
    if (expected !== sigB64) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
      exp?: number; email?: string; role?: string;
    };
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getAuthEmail(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization as string | undefined;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return "";

  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    const payload = await verifyJwt(token, jwtSecret);
    if (payload?.email) return payload.email.toLowerCase();
  }

  const clerkSecret = process.env.CLERK_SECRET_KEY;
  if (clerkSecret) {
    try {
      const payload = await verifyToken(token, { secretKey: clerkSecret });
      if (payload.sub) {
        const resp = await fetch(`https://api.clerk.com/v1/users/${payload.sub}`, {
          headers: { Authorization: `Bearer ${clerkSecret}` },
        });
        if (resp.ok) {
          const user = await resp.json() as {
            email_addresses?: { id: string; email_address: string }[];
            primary_email_address_id?: string;
          };
          const emailObj = user.email_addresses?.find((e) => e.id === user.primary_email_address_id);
          return emailObj?.email_address?.toLowerCase() ?? "";
        }
      }
    } catch {}
  }

  return "";
}

export async function requireAdmin(req: VercelRequest, res: VercelResponse): Promise<string | null> {
  const email = await getAuthEmail(req);
  if (!email) { err(res, "Authentication required.", 401); return null; }
  if (!getAdminEmails().includes(email)) { err(res, "Forbidden: admin access required.", 403); return null; }
  return email;
}

export async function requireAuth(req: VercelRequest, res: VercelResponse): Promise<string | null> {
  const email = await getAuthEmail(req);
  if (!email) { err(res, "Authentication required.", 401); return null; }
  return email;
}

export async function getMetricValues(category: string): Promise<Map<string, number>> {
  const db = getPool();
  try {
    const { rows } = await db.query(
      `SELECT metric_key, value FROM metrics_snapshots WHERE category = $1`, [category]
    );
    return new Map(rows.map((r: { metric_key: string; value: number }) => [r.metric_key, r.value]));
  } catch {
    return new Map();
  }
}

export async function getTrendValues(category: string): Promise<Map<string, { month: string; value: number }[]>> {
  const db = getPool();
  try {
    const { rows } = await db.query(
      `SELECT metric_key, period_label, value FROM metrics_snapshots WHERE category = $1 ORDER BY id ASC`,
      [`${category}_trend`]
    );
    const result = new Map<string, { month: string; value: number }[]>();
    for (const row of rows as { metric_key: string; period_label: string; value: number }[]) {
      const arr = result.get(row.metric_key) ?? [];
      arr.push({ month: row.period_label, value: row.value });
      result.set(row.metric_key, arr);
    }
    return result;
  } catch {
    return new Map();
  }
}
