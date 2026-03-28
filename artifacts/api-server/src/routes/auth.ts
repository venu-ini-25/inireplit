import { Router } from "express";
import jwt from "jsonwebtoken";

const router = Router();

const MASTER_EMAIL = process.env["MASTER_EMAIL"];
const MASTER_PASSWORD = process.env["MASTER_PASSWORD"];
const JWT_SECRET = process.env["JWT_SECRET"] || "fallback-secret-change-me";

if (!MASTER_EMAIL || !MASTER_PASSWORD) {
  console.warn("[auth] MASTER_EMAIL or MASTER_PASSWORD not set — master login will be disabled");
}

router.post("/auth/login", (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  const isMaster =
    MASTER_EMAIL &&
    MASTER_PASSWORD &&
    email.trim().toLowerCase() === MASTER_EMAIL.trim().toLowerCase() &&
    password === MASTER_PASSWORD;

  if (!isMaster) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const token = jwt.sign(
    {
      email: MASTER_EMAIL,
      name: "Venu Vegi",
      role: "master",
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

  res.json({
    token,
    user: {
      email: MASTER_EMAIL,
      name: "Venu Vegi",
      role: "master",
    },
  });
});

router.get("/auth/verify", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "No token provided." });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: payload });
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
});

export default router;
