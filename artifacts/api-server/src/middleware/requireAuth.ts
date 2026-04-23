import { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.auth;
  if (!auth || auth.source === "none") {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  next();
}
