import { Request, Response, NextFunction } from "express";
import { createClerkClient, verifyToken } from "@clerk/backend";
import jwt from "jsonwebtoken";

export interface AuthContext {
  email: string;
  role: string;
  userId?: string;
  source: "clerk" | "master" | "none";
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

const CLERK_SECRET_KEY = process.env["CLERK_SECRET_KEY"];

let clerkClient: ReturnType<typeof createClerkClient> | null = null;
if (CLERK_SECRET_KEY) {
  clerkClient = createClerkClient({ secretKey: CLERK_SECRET_KEY });
}

function getAdminEmails(): string[] {
  const envEmails = process.env["ADMIN_EMAILS"];
  if (envEmails) {
    return envEmails.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  }
  return ["venu.vegi@inventninvest.com", "pitch@inventninvest.com"];
}

async function extractFromClerk(token: string): Promise<AuthContext | null> {
  if (!clerkClient || !CLERK_SECRET_KEY) return null;
  try {
    const payload = await verifyToken(token, { secretKey: CLERK_SECRET_KEY });
    const user = await clerkClient.users.getUser(payload.sub);
    const emailObj = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
    const email = emailObj?.emailAddress ?? "";
    const adminEmails = getAdminEmails();
    const role = adminEmails.includes(email.toLowerCase()) ? "admin" : "viewer";
    return { email, role, userId: payload.sub, source: "clerk" };
  } catch {
    return null;
  }
}

function extractFromMasterJwt(token: string): AuthContext | null {
  const secret = process.env["JWT_SECRET"];
  if (!secret) return null;
  try {
    const payload = jwt.verify(token, secret) as { email?: string; role?: string };
    const email = payload.email ?? "";
    const adminEmails = getAdminEmails();
    const isMaster = payload.role === "master" || adminEmails.includes(email.toLowerCase());
    if (!isMaster) return null;
    return { email, role: "master", source: "master" };
  } catch {
    return null;
  }
}

export async function extractAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    req.auth = { email: "", role: "none", source: "none" };
    next();
    return;
  }

  const clerkCtx = await extractFromClerk(token);
  if (clerkCtx) {
    req.auth = clerkCtx;
    next();
    return;
  }

  const masterCtx = extractFromMasterJwt(token);
  req.auth = masterCtx ?? { email: "", role: "none", source: "none" };
  next();
}

export function getAdminEmailsForCheck(): string[] {
  return getAdminEmails();
}
