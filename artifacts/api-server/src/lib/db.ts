import { Pool } from "pg";

const connStr = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false },
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS access_requests (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT,
      role TEXT NOT NULL,
      aum TEXT,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_access_requests_email ON access_requests(email);
    CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
  `);
}

export default pool;
