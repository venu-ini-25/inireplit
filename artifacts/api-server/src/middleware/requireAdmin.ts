import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const ADMIN_EMAILS = ["venu.vegi@inventninvest.com", "pitch@inventninvest.com"];
const JWT_SECRET = process.env["JWT_SECRET"] || "fallback-secret-change-me";

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
    payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
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
