import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAdmin, getPool } from "../_utils.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") { err(res, "Method not allowed", 405); return; }

  const email = await requireAdmin(req, res);
  if (!email) return;

  const db = getPool();
  try {
    const { rows } = await db.query(
      `SELECT * FROM import_logs ORDER BY imported_at DESC LIMIT 20`
    );
    ok(res, rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      fileName: r.file_name,
      tableType: r.table_type,
      totalRows: r.total_rows,
      importedRows: r.imported_rows,
      skippedRows: r.skipped_rows,
      errorRows: r.error_rows,
      errors: r.errors,
      columnMapping: r.column_mapping,
      importedAt: r.imported_at,
    })));
  } catch (e) {
    err(res, (e as Error).message, 500);
  }
}
