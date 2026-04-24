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

  // ── Core business tables ────────────────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      industry         TEXT NOT NULL DEFAULT '',
      stage            TEXT NOT NULL DEFAULT 'seed',
      revenue          INTEGER NOT NULL DEFAULT 0,
      valuation        INTEGER NOT NULL DEFAULT 0,
      growth_rate      DOUBLE PRECISION NOT NULL DEFAULT 0,
      employees        INTEGER NOT NULL DEFAULT 0,
      location         TEXT NOT NULL DEFAULT '',
      status           TEXT NOT NULL DEFAULT 'active',
      data_verified    BOOLEAN NOT NULL DEFAULT false,
      nda_signed       BOOLEAN NOT NULL DEFAULT false,
      logo             TEXT NOT NULL DEFAULT '',
      founded          INTEGER,
      ownership        TEXT,
      arr              TEXT,
      arr_growth_pct   DOUBLE PRECISION,
      irr              TEXT,
      moic             TEXT,
      last_val_date    TEXT,
      investors        JSONB DEFAULT '[]'::jsonb,
      arr_trend        JSONB DEFAULT '[]'::jsonb,
      headcount_trend  JSONB DEFAULT '[]'::jsonb,
      burn_trend       JSONB DEFAULT '[]'::jsonb,
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
    CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS deals (
      id                  TEXT PRIMARY KEY,
      company_name        TEXT NOT NULL,
      industry            TEXT NOT NULL DEFAULT '',
      deal_type           TEXT NOT NULL DEFAULT 'investment',
      stage               TEXT NOT NULL DEFAULT 'sourcing',
      deal_size           INTEGER NOT NULL DEFAULT 0,
      valuation           INTEGER NOT NULL DEFAULT 0,
      target_revenue      INTEGER NOT NULL DEFAULT 0,
      assigned_to         TEXT NOT NULL DEFAULT '',
      priority            TEXT NOT NULL DEFAULT 'medium',
      closing_date        TEXT,
      nda_signed          BOOLEAN NOT NULL DEFAULT false,
      data_room_access    BOOLEAN NOT NULL DEFAULT false,
      overview            TEXT NOT NULL DEFAULT '',
      thesis              TEXT NOT NULL DEFAULT '',
      financials          JSONB,
      synergies           JSONB DEFAULT '[]'::jsonb,
      contacts            JSONB DEFAULT '[]'::jsonb,
      documents           JSONB DEFAULT '[]'::jsonb,
      due_diligence_items JSONB DEFAULT '[]'::jsonb,
      timeline            JSONB DEFAULT '[]'::jsonb,
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      updated_at          TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
    CREATE INDEX IF NOT EXISTS idx_deals_company_name ON deals(company_name);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS financial_snapshots (
      id         TEXT PRIMARY KEY,
      period     TEXT NOT NULL,
      revenue    INTEGER NOT NULL DEFAULT 0,
      expenses   INTEGER NOT NULL DEFAULT 0,
      ebitda     INTEGER NOT NULL DEFAULT 0,
      arr        INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_financial_snapshots_period ON financial_snapshots(period);
    CREATE INDEX IF NOT EXISTS idx_financial_snapshots_sort ON financial_snapshots(sort_order ASC);
  `);
  // Ensure updated_at exists on tables that may have been created before this column was added
  await db.query(`ALTER TABLE financial_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS metrics_snapshots (
      id           TEXT PRIMARY KEY,
      category     TEXT NOT NULL,
      metric_key   TEXT NOT NULL,
      metric_label TEXT NOT NULL DEFAULT '',
      value        DOUBLE PRECISION NOT NULL DEFAULT 0,
      unit         TEXT NOT NULL DEFAULT '',
      period_label TEXT NOT NULL DEFAULT '',
      source       TEXT NOT NULL DEFAULT 'manual',
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_metrics_snapshots_category ON metrics_snapshots(category);
    CREATE INDEX IF NOT EXISTS idx_metrics_snapshots_metric_key ON metrics_snapshots(metric_key);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS engagements (
      id           TEXT PRIMARY KEY,
      client_name  TEXT NOT NULL,
      service_type TEXT NOT NULL DEFAULT 'fpa',
      status       TEXT NOT NULL DEFAULT 'active',
      start_date   TEXT,
      end_date     TEXT,
      fee          INTEGER NOT NULL DEFAULT 0,
      progress     INTEGER NOT NULL DEFAULT 0,
      lead         TEXT NOT NULL DEFAULT '',
      description  TEXT NOT NULL DEFAULT '',
      deliverables JSONB DEFAULT '[]'::jsonb,
      team         JSONB DEFAULT '[]'::jsonb,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_engagements_status ON engagements(status);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS integration_connections (
      id               TEXT PRIMARY KEY,
      provider         TEXT NOT NULL,
      display_name     TEXT NOT NULL DEFAULT '',
      status           TEXT NOT NULL DEFAULT 'disconnected',
      access_token     TEXT,
      refresh_token    TEXT,
      token_expires_at TIMESTAMPTZ,
      realm_id         TEXT,
      extra            JSONB DEFAULT '{}'::jsonb,
      last_sync_at     TIMESTAMPTZ,
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_integration_connections_provider ON integration_connections(provider);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id             TEXT PRIMARY KEY,
      integration_id TEXT NOT NULL,
      provider       TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'running',
      records_synced INTEGER NOT NULL DEFAULT 0,
      error_message  TEXT,
      started_at     TIMESTAMPTZ DEFAULT NOW(),
      completed_at   TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_sync_logs_integration_id ON sync_logs(integration_id);
    CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at DESC);
  `);

  // ── Admin / operational tables ──────────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS access_requests (
      id           TEXT PRIMARY KEY,
      first_name   TEXT NOT NULL,
      last_name    TEXT NOT NULL,
      email        TEXT NOT NULL,
      company      TEXT DEFAULT '',
      role         TEXT NOT NULL,
      aum          TEXT DEFAULT '',
      message      TEXT DEFAULT '',
      status       TEXT NOT NULL DEFAULT 'pending',
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at  TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_access_requests_email ON access_requests(email);
    CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
  `);
  await db.query(`ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS platform_access TEXT NOT NULL DEFAULT 'demo';`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS import_logs (
      id            TEXT PRIMARY KEY,
      file_name     TEXT NOT NULL,
      table_type    TEXT NOT NULL,
      total_rows    INTEGER NOT NULL DEFAULT 0,
      imported_rows INTEGER NOT NULL DEFAULT 0,
      skipped_rows  INTEGER NOT NULL DEFAULT 0,
      error_rows    INTEGER NOT NULL DEFAULT 0,
      errors        JSONB,
      column_mapping JSONB,
      imported_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_import_logs_imported_at ON import_logs(imported_at DESC);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS ai_usage_log (
      id         BIGSERIAL PRIMARY KEY,
      endpoint   TEXT NOT NULL,
      called_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
