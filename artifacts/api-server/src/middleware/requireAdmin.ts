import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const ADMIN_EMAILS = ["venu.vegi@inventninvest.com", "pitch@inventninvest.com"];

function getJwtSecret(): string {
  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    throw new Error(
      "[requireAdmin] JWT_SECRET environment variable must be set. " +
      "The server refuses to start with a default secret to prevent token forgery."
    );
  }
  return secret;
}

interface JwtPayload {
  email?: string;
  role?: string;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, getJwtSecret()) as JwtPayload;
  } catch (err) {
    if (err instanceof Error && err.message.includes("JWT_SECRET")) {
      res.status(500).json({ error: "Server misconfiguration: JWT_SECRET not set." });
    } else {
      res.status(401).json({ error: "Invalid or expired token." });
    }
    return;
  }

  const email = payload.email?.trim().toLowerCase() ?? "";
  const isAdmin =
    payload.role === "master" ||
    ADMIN_EMAILS.some((a) => a.toLowerCase() === email);

  if (!isAdmin) {
    res.status(403).json({ error: "Forbidden: admin access required." });
    return;
  }

  next();
}
