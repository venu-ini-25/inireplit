import { Request, Response, NextFunction } from "express";
import { createClerkClient, verifyToken } from "@clerk/backend";
import jwt from "jsonwebtoken";

const ADMIN_EMAILS = ["venu.vegi@inventninvest.com", "pitch@inventninvest.com"];

function getJwtSecret(): string {
  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    throw new Error(
      "[requireAdmin] JWT_SECRET environment variable must be set. " +
        "The server refuses to start without a secure secret."
    );
  }
  return secret;
}

const CLERK_SECRET_KEY = process.env["CLERK_SECRET_KEY"];

let clerkClient: ReturnType<typeof createClerkClient> | null = null;
if (CLERK_SECRET_KEY) {
  clerkClient = createClerkClient({ secretKey: CLERK_SECRET_KEY });
} else {
  console.warn(
    "[requireAdmin] CLERK_SECRET_KEY not set — Clerk JWT verification disabled. " +
      "Only master JWT tokens will be accepted."
  );
}

function isAdminEmail(email: string): boolean {
  const normalised = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((a) => a.toLowerCase() === normalised);
}

async function verifyClerkToken(token: string): Promise<boolean> {
  if (!clerkClient || !CLERK_SECRET_KEY) return false;

  try {
    const payload = await verifyToken(token, { secretKey: CLERK_SECRET_KEY });
    const userId = payload.sub;

    const user = await clerkClient.users.getUser(userId);
    const primaryEmailId = user.primaryEmailAddressId;
    const emailObj = user.emailAddresses.find((e) => e.id === primaryEmailId);
    const email = emailObj?.emailAddress ?? "";

    return isAdminEmail(email);
  } catch {
    return false;
  }
}

function verifyMasterToken(token: string): boolean {
  try {
    const secret = getJwtSecret();
    const payload = jwt.verify(token, secret) as {
      email?: string;
      role?: string;
    };
    return (
      payload.role === "master" ||
      isAdminEmail(payload.email ?? "")
    );
  } catch {
    return false;
  }
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    const isClerkAdmin = await verifyClerkToken(token);
    if (isClerkAdmin) {
      next();
      return;
    }

    const isMasterAdmin = verifyMasterToken(token);
    if (isMasterAdmin) {
      next();
      return;
    }

    res.status(403).json({ error: "Forbidden: admin access required." });
  } catch (err) {
    if (err instanceof Error && err.message.includes("JWT_SECRET")) {
      res.status(500).json({ error: "Server misconfiguration: JWT_SECRET not set." });
    } else {
      res.status(401).json({ error: "Invalid or expired token." });
    }
  }
}
