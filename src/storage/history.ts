import { compactHistoryDatabase, getDb } from './db';
import type { Verdict } from '@/core/types';

export interface ScanRecord {
  id: number;
  timestamp: number;
  verdict: Verdict;
  score: number;
  flag_count: number;
  input_type: 'text' | 'image' | 'qr';
}

export interface SaveScanInput {
  verdict: Verdict;
  score: number;
  flagCount: number;
  inputType: 'text' | 'image' | 'qr';
}

export interface ScanStats {
  total: number;
  scamCount: number;
  suspiciousCount: number;
  lowRiskCount: number;
}

function validateRecord(row: ScanRecord): ScanRecord {
  if (
    !Number.isSafeInteger(row.id) ||
    row.id <= 0 ||
    !Number.isSafeInteger(row.timestamp) ||
    row.timestamp < 0 ||
    !['scam', 'suspicious', 'low_risk'].includes(row.verdict) ||
    typeof row.score !== 'number' ||
    !Number.isFinite(row.score) ||
    row.score < 0 ||
    row.score > 100 ||
    !Number.isSafeInteger(row.flag_count) ||
    row.flag_count < 0 ||
    !['text', 'image', 'qr'].includes(row.input_type)
  ) {
    throw new TypeError(
      'Scan history contains invalid metadata. The record could not be loaded or saved.',
    );
  }
  return {
    id: row.id,
    timestamp: row.timestamp,
    verdict: row.verdict,
    score: row.score,
    flag_count: row.flag_count,
    input_type: row.input_type,
  };
}

/** Persists only metadata and atomically retains the most recent 100 records. */
export async function saveScanRecord(input: SaveScanInput): Promise<number> {
  const metadata = validateRecord({
    id: 1,
    timestamp: Date.now(),
    verdict: input.verdict,
    score: input.score,
    flag_count: input.flagCount,
    input_type: input.inputType,
  });
  const db = await getDb();
  let id = 0;
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync('PRAGMA secure_delete = ON;');
    const result = await txn.runAsync(
      `INSERT INTO scan_history (timestamp, verdict, score, flag_count, input_type)
       VALUES (?, ?, ?, ?, ?)`,
      metadata.timestamp,
      metadata.verdict,
      metadata.score,
      metadata.flag_count,
      metadata.input_type,
    );
    id = result.lastInsertRowId;
    await txn.runAsync(
      `DELETE FROM scan_history WHERE id NOT IN (
         SELECT id FROM scan_history ORDER BY timestamp DESC, id DESC LIMIT 100
       )`,
    );
  });
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('The history database did not return a valid saved record ID.');
  }
  return id;
}

/** Fetches and validates metadata ordered by newest first. Storage errors propagate to the UI. */
export async function getRecentScans(limit: number): Promise<ScanRecord[]> {
  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw new RangeError('History limit must be a positive integer.');
  }
  const db = await getDb();
  const rows = await db.getAllAsync<ScanRecord>(
    `SELECT id, timestamp, verdict, score, flag_count, input_type
     FROM scan_history ORDER BY timestamp DESC, id DESC LIMIT ?`,
    limit,
  );
  return rows.map(validateRecord);
}

/** Computes all summary counts in one query so they refer to the same database snapshot. */
export async function getScanStats(): Promise<ScanStats> {
  const db = await getDb();
  const stats = await db.getFirstAsync<ScanStats>(
    `SELECT COUNT(*) AS total,
      COUNT(CASE WHEN verdict = 'scam' THEN 1 END) AS scamCount,
      COUNT(CASE WHEN verdict = 'suspicious' THEN 1 END) AS suspiciousCount,
      COUNT(CASE WHEN verdict = 'low_risk' THEN 1 END) AS lowRiskCount
    FROM scan_history`,
  );
  if (
    !stats ||
    ![stats.total, stats.scamCount, stats.suspiciousCount, stats.lowRiskCount].every(
      (count) => Number.isSafeInteger(count) && count >= 0,
    ) ||
    stats.total !== stats.scamCount + stats.suspiciousCount + stats.lowRiskCount
  ) {
    throw new TypeError('Scan history summary contains invalid counts. Reload history.');
  }
  return stats;
}

/** Deletes metadata and compacts the live database; failures must be displayed by the caller. */
export async function clearScanHistory(): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync('PRAGMA secure_delete = ON; DELETE FROM scan_history;');
  });
  await compactHistoryDatabase(db);
}
