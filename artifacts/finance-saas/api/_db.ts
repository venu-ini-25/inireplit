import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

export async function ensureTable() {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS access_requests (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT DEFAULT '',
      role TEXT NOT NULL,
      aum TEXT DEFAULT '',
      message TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_access_requests_email ON access_requests(email);
    CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
  `);
  await db.query(
    `ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS platform_access TEXT NOT NULL DEFAULT 'demo';`
  );
  await db.query(`
    CREATE TABLE IF NOT EXISTS import_logs (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      table_type TEXT NOT NULL,
      total_rows INTEGER NOT NULL DEFAULT 0,
      imported_rows INTEGER NOT NULL DEFAULT 0,
      skipped_rows INTEGER NOT NULL DEFAULT 0,
      error_rows INTEGER NOT NULL DEFAULT 0,
      errors JSONB,
      column_mapping JSONB,
      imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_import_logs_imported_at ON import_logs(imported_at DESC);
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS ai_usage_log (
      id BIGSERIAL PRIMARY KEY,
      endpoint TEXT NOT NULL,
      called_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ai_usage_called_at ON ai_usage_log(called_at DESC);
  `);
}

const AI_DAILY_CAP = parseInt(process.env.AI_DAILY_CAP ?? "50", 10);

export async function checkAndRecordAiUsage(endpoint: string): Promise<{ allowed: boolean; usedToday: number; cap: number }> {
  const db = getPool();
  await ensureTable();
  const { rows } = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ai_usage_log WHERE called_at >= NOW() - INTERVAL '24 hours'`
  );
  const usedToday = parseInt(rows[0]?.count ?? "0", 10);
  if (usedToday >= AI_DAILY_CAP) {
    return { allowed: false, usedToday, cap: AI_DAILY_CAP };
  }
  await db.query(`INSERT INTO ai_usage_log (endpoint) VALUES ($1)`, [endpoint]);
  return { allowed: true, usedToday: usedToday + 1, cap: AI_DAILY_CAP };
}

export function rowToRequest(row: Record<string, unknown>) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    company: (row.company as string) ?? "",
    role: row.role,
    aum: (row.aum as string) ?? "",
    message: (row.message as string) ?? "",
    status: row.status,
    platformAccess: (row.platform_access as string) ?? "demo",
    submittedAt: (row.submitted_at as Date).toISOString(),
    reviewedAt: row.reviewed_at ? (row.reviewed_at as Date).toISOString() : null,
  };
}
