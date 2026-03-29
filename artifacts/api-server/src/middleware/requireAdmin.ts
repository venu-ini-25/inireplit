import { Request, Response, NextFunction } from "express";
import { getAdminEmailsForCheck } from "./extractAuth";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = req.auth;

  if (!auth || auth.source === "none") {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const adminEmails = getAdminEmailsForCheck();
  const isAdmin =
    auth.role === "master" ||
    auth.role === "admin" ||
    adminEmails.includes(auth.email.toLowerCase());

  if (!isAdmin) {
    res.status(403).json({ error: "Forbidden: admin access required." });
    return;
  }

  next();
}
