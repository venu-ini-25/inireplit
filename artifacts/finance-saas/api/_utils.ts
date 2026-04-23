import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";

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

// ── Layer 1: HMAC JWT (custom admin tokens signed with SESSION_SECRET) ────────

async function verifyHmacJwt(token: string, secret: string): Promise<{ email?: string; role?: string } | null> {
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

// ── Layer 2: Clerk RS256 JWT — JWKS verification + email lookup ───────────────

/** Decode (without verification) the JWT payload. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Derive the expected Clerk frontend API domain from the publishable key. */
function getExpectedClerkDomain(): string | null {
  const pk = process.env.VITE_CLERK_PUBLISHABLE_KEY ?? process.env.CLERK_PUBLISHABLE_KEY;
  if (!pk) return null;
  try {
    const encoded = pk.replace(/^pk_(live|test)_/, "");
    return Buffer.from(encoded, "base64url").toString("utf8").replace(/\$$/, "").trim() || null;
  } catch {
    return null;
  }
}

/** Verify a Clerk RS256 JWT signature using the public JWKS endpoint.
 *  Returns the decoded payload if valid, null otherwise. No secret key required.
 *  Uses Node.js native crypto (battle-tested, works in all serverless environments). */
export async function verifyClerkJwt(token: string): Promise<{ payload: Record<string, unknown> | null; error: string }> {
  try {
    const [headerB64, payloadB64, sigB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !sigB64) return { payload: null, error: "malformed JWT (not 3 parts)" };

    const header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8")) as {
      alg?: string; kid?: string;
    };
    if (header.alg !== "RS256") return { payload: null, error: `unsupported alg: ${header.alg}` };

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
      iss?: string; sub?: string; exp?: number;
    };
    if (!payload.iss || !payload.sub) return { payload: null, error: "missing iss or sub claim" };
    if (payload.exp && payload.exp < Date.now() / 1000) return { payload: null, error: "JWT expired" };

    // Security: validate issuer matches our Clerk instance
    const expectedDomain = getExpectedClerkDomain();
    if (expectedDomain && !payload.iss.includes(expectedDomain)) {
      return { payload: null, error: `issuer mismatch: ${payload.iss} does not include ${expectedDomain}` };
    }

    // Fetch the public JWKS
    const jwksResp = await fetch(`${payload.iss}/.well-known/jwks.json`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!jwksResp.ok) return { payload: null, error: `JWKS fetch failed: HTTP ${jwksResp.status}` };
    const jwksJson = await jwksResp.json() as { keys?: { kid?: string; kty?: string; n?: string; e?: string; alg?: string; use?: string }[] };
    const keys = jwksJson.keys ?? [];
    const jwk = header.kid ? keys.find((k) => k.kid === header.kid) : keys[0];
    if (!jwk) return { payload: null, error: `JWK not found for kid: ${header.kid}` };

    // Use Node.js native crypto — battle-tested, works in all serverless environments
    const { createPublicKey, createVerify } = await import("crypto");
    const publicKey = createPublicKey({ key: jwk as never, format: "jwk" });
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${headerB64}.${payloadB64}`);
    const valid = verifier.verify(publicKey, Buffer.from(sigB64, "base64url"));

    if (!valid) return { payload: null, error: "signature verification failed" };
    return { payload: payload as Record<string, unknown>, error: "" };
  } catch (e) {
    return { payload: null, error: `JWT verification exception: ${(e as Error).message}` };
  }
}

/** Look up a user's email via Clerk API using CLERK_SECRET_KEY. */
async function getEmailFromClerkApi(sub: string, clerkSecret: string): Promise<string> {
  try {
    const resp = await fetch(`https://api.clerk.com/v1/users/${sub}`, {
      headers: { Authorization: `Bearer ${clerkSecret}` },
      signal: AbortSignal.timeout(6000),
    });
    if (!resp.ok) return "";
    const user = await resp.json() as {
      email_addresses?: { id: string; email_address: string }[];
      primary_email_address_id?: string;
    };
    const emailObj = user.email_addresses?.find((e) => e.id === user.primary_email_address_id);
    return emailObj?.email_address?.toLowerCase() ?? "";
  } catch {
    return "";
  }
}

// ── Main auth entry point ─────────────────────────────────────────────────────

export async function getAuthEmail(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization as string | undefined;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return "";

  // Layer 1: HMAC — for custom admin tokens signed with SESSION_SECRET / JWT_SECRET
  const jwtSecrets = [process.env.JWT_SECRET, process.env.SESSION_SECRET].filter(Boolean) as string[];
  for (const secret of jwtSecrets) {
    const payload = await verifyHmacJwt(token, secret);
    if (payload?.email) return payload.email.toLowerCase();
  }

  // Layer 2: Clerk RS256 JWT (what getToken() returns in the browser)
  // Step A: Verify signature using Clerk's public JWKS (reliable, no secret needed)
  // Step B: Get email — from custom claim, or Clerk API (uses CLERK_SECRET_KEY)
  const { payload: verified } = await verifyClerkJwt(token);
  if (verified) {
    // 2a. Email in JWT custom claim (fastest — configure in Clerk Dashboard → Sessions)
    const claimEmail = (verified["email"] ?? verified["email_address"]) as string | undefined;
    if (claimEmail) return claimEmail.toLowerCase();

    // 2b. Clerk API email lookup using CLERK_SECRET_KEY
    const clerkSecret = process.env.CLERK_SECRET_KEY;
    const sub = verified["sub"] as string | undefined;
    if (clerkSecret && sub) {
      const email = await getEmailFromClerkApi(sub, clerkSecret);
      if (email) return email;
    }

    // 2c. Last resort: check if sub matches a configured admin user ID
    const adminUserIds = (process.env.ADMIN_CLERK_USER_IDS ?? "").split(",").map(s => s.trim()).filter(Boolean);
    const sub2 = verified["sub"] as string | undefined;
    if (sub2 && adminUserIds.includes(sub2)) {
      return getAdminEmails()[0] ?? "";
    }
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

/** Parse the sub-path from req.url — always reliable on Vercel */
export function extractPath(req: VercelRequest, base: string): string[] {
  const urlPath = (req.url ?? "").split("?")[0];
  const after = urlPath.startsWith(base) ? urlPath.slice(base.length) : urlPath;
  return after.split("/").filter(Boolean);
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
