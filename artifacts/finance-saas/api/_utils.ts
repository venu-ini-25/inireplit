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

/** Derive the expected Clerk frontend API domain from VITE_CLERK_PUBLISHABLE_KEY.
 *  Format: pk_live_<base64url(domain + "$")> or pk_test_<...> */
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

/** Verify a Clerk RS256 JWT using the public JWKS endpoint (no secret key needed).
 *  Returns the decoded payload if valid, null otherwise. */
async function verifyClerkJwtPublic(token: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;

    const header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8")) as {
      alg?: string; kid?: string;
    };
    if (header.alg !== "RS256") return null;

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
      iss?: string; sub?: string; exp?: number; iat?: number;
      email?: string; email_address?: string;
    };
    if (!payload.iss || !payload.sub) return null;
    if (payload.exp && payload.exp < Date.now() / 1000) return null;

    // Security: validate the issuer matches our Clerk instance
    const expectedDomain = getExpectedClerkDomain();
    if (expectedDomain && !payload.iss.includes(expectedDomain)) return null;

    // Fetch the JWKS from the issuer's public endpoint
    const jwksResp = await fetch(`${payload.iss}/.well-known/jwks.json`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!jwksResp.ok) return null;
    const { keys } = await jwksResp.json() as { keys: (JsonWebKey & { kid?: string })[] };
    const jwk = header.kid ? keys.find((k) => k.kid === header.kid) : keys[0];
    if (!jwk) return null;

    // Verify the RS256 signature using Web Crypto (built into Node 18+)
    const cryptoKey = await crypto.subtle.importKey(
      "jwk", jwk as JsonWebKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false, ["verify"]
    );
    const signingInput = `${headerB64}.${payloadB64}`;
    const sigBytes = Buffer.from(sigB64, "base64url");
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5", cryptoKey, sigBytes,
      new TextEncoder().encode(signingInput)
    );
    if (!valid) return null;

    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Get email from the Clerk OIDC userinfo endpoint — accepts session JWTs as bearer. */
async function getEmailFromClerkUserinfo(token: string, iss: string): Promise<string> {
  try {
    const resp = await fetch(`${iss}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return "";
    const info = await resp.json() as { email?: string; email_address?: string };
    return (info.email ?? info.email_address ?? "").toLowerCase();
  } catch {
    return "";
  }
}

export async function getAuthEmail(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization as string | undefined;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return "";

  // Layer 1: HMAC secrets — for custom admin tokens (JWT_SECRET / SESSION_SECRET)
  const jwtSecrets = [process.env.JWT_SECRET, process.env.SESSION_SECRET].filter(Boolean) as string[];
  for (const secret of jwtSecrets) {
    const payload = await verifyHmacJwt(token, secret);
    if (payload?.email) return payload.email.toLowerCase();
  }

  // Layer 2: Clerk secret key — full server-side verification + email lookup
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
          if (emailObj?.email_address) return emailObj.email_address.toLowerCase();
        }
      }
    } catch {}
  }

  // Layer 3: Public JWKS verification — works without CLERK_SECRET_KEY on Vercel.
  // Verifies the RS256 signature using Clerk's public JWKS endpoint, then retrieves
  // the email via the Clerk OIDC userinfo endpoint (which accepts session JWTs as bearer).
  const verified = await verifyClerkJwtPublic(token);
  if (verified) {
    const iss = verified["iss"] as string;

    // Try email from JWT custom claims first (fastest, no network call)
    const claimEmail = (verified["email"] ?? verified["email_address"]) as string | undefined;
    if (claimEmail) return claimEmail.toLowerCase();

    // Fall back to userinfo endpoint
    const email = await getEmailFromClerkUserinfo(token, iss);
    if (email) return email;
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

/** Parse the sub-path from req.url — always reliable on Vercel (req.query.path can be string or array) */
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
