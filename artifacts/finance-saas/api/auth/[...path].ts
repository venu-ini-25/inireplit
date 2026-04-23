import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, err } from "../_utils.js";
import { createHmac } from "crypto";

function getJwtSecret(): string | null {
  return process.env.JWT_SECRET ?? process.env.SESSION_SECRET ?? null;
}

function base64url(s: string): string {
  return Buffer.from(s).toString("base64url");
}

function signJwt(payload: Record<string, unknown>, secret: string): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600 }));
  const sig = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyJwt(token: string, secret: string): Record<string, unknown> | null {
  try {
    const [h, p, s] = token.split(".");
    if (!h || !p || !s) return null;
    const expected = createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url");
    if (expected !== s) return null;
    const payload = JSON.parse(Buffer.from(p, "base64url").toString("utf8")) as Record<string, unknown>;
    if (payload.exp && (payload.exp as number) < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;

  const pathParts = (req.query.path as string[]) ?? [];
  const sub = pathParts[0] ?? "";

  if (sub === "login" && req.method === "POST") {
    const secret = getJwtSecret();
    if (!secret) { err(res, "Server configuration error: no JWT secret set.", 500); return; }

    const body = req.body as { email?: string; password?: string };
    const { email, password } = body ?? {};

    const masterEmail = process.env.MASTER_EMAIL;
    const masterPassword = process.env.MASTER_PASSWORD;

    if (!masterEmail || !masterPassword) {
      err(res, "Master admin not configured on this deployment.", 500);
      return;
    }

    const emailOk = email?.trim().toLowerCase() === masterEmail.trim().toLowerCase();
    const passOk = password === masterPassword;

    if (!emailOk || !passOk) {
      err(res, "Invalid email or password.", 401);
      return;
    }

    const token = signJwt({ email: masterEmail, name: "Venu Vegi", role: "master" }, secret);
    res.status(200).json({ token, user: { email: masterEmail, name: "Venu Vegi", role: "master" } });
    return;
  }

  if (sub === "verify" && req.method === "GET") {
    const secret = getJwtSecret();
    if (!secret) { err(res, "Server configuration error.", 500); return; }

    const authHeader = req.headers.authorization as string | undefined;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) { err(res, "No token provided.", 401); return; }

    const payload = verifyJwt(token, secret);
    if (!payload) { err(res, "Invalid or expired token.", 401); return; }

    res.status(200).json({ valid: true, user: payload });
    return;
  }

  err(res, "Not found", 404);
}
