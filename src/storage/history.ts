import { getDb } from './db';
import type { Verdict } from '@/core/types';

export interface ScanRecord {
  id: number;
  timestamp: number;
  verdict: Verdict;
  score: number;
  flag_count: number;
  flags_summary: string | null;
  snippet: string;
  input_type: 'text' | 'image' | 'qr';
}

export interface SaveScanInput {
  rawText: string;
  verdict: Verdict;
  score: number;
  flags?: Array<{ tl?: string; label?: string; id?: string }>;
  inputType?: 'text' | 'image' | 'qr';
}

/**
 * Redacts potential OTPs or 4-8 digit numbers from the snippet
 * to preserve user privacy (SEC-03).
 */
export function sanitizeSnippet(rawText: string, maxLen = 80): string {
  if (!rawText) return '';
  const collapsed = rawText.trim().replace(/\s+/g, ' ');
  const sanitized = collapsed.replace(/\b\d{4,8}\b/g, '[CODE]');
  return sanitized.length > maxLen ? sanitized.slice(0, maxLen) + '…' : sanitized;
}

/**
 * Asynchronously saves a scan event to SQLite without blocking the UI.
 * Automatically keeps only the most recent 100 entries.
 */
export async function saveScanRecord(input: SaveScanInput): Promise<number | null> {
  try {
    const db = await getDb();
    const timestamp = Date.now();
    const snippet = sanitizeSnippet(input.rawText);
    const flagCount = input.flags?.length ?? 0;
    const flagsSummary = input.flags
      ? input.flags
          .map((f) => f.tl || f.label || f.id || '')
          .filter(Boolean)
          .join(', ')
      : '';
    const inputType = input.inputType ?? 'text';

    const result = await db.runAsync(
      `INSERT INTO scan_history (timestamp, verdict, score, flag_count, flags_summary, snippet, input_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      timestamp,
      input.verdict,
      input.score,
      flagCount,
      flagsSummary,
      snippet,
      inputType,
    );

    // Auto-prune old records to maintain bounded storage
    await db.runAsync(
      `DELETE FROM scan_history WHERE id NOT IN (
         SELECT id FROM scan_history ORDER BY timestamp DESC LIMIT 100
       )`,
    );

    return result.lastInsertRowId;
  } catch (err) {
    // Graceful fallback: do not interrupt the app if SQLite write encounters an error
    console.warn('Failed to save scan record to SQLite:', err);
    return null;
  }
}

/**
 * Fetches recent scan history ordered by newest first.
 */
export async function getRecentScans(limit = 20): Promise<ScanRecord[]> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<ScanRecord>(
      `SELECT id, timestamp, verdict, score, flag_count, flags_summary, snippet, input_type
       FROM scan_history
       ORDER BY timestamp DESC
       LIMIT ?`,
      limit,
    );
    return rows;
  } catch (err) {
    console.warn('Failed to fetch scan history:', err);
    return [];
  }
}

/**
 * Computes aggregate summary statistics from the scan history.
 */
export async function getScanStats(): Promise<{
  total: number;
  scamCount: number;
  suspiciousCount: number;
  lowRiskCount: number;
}> {
  try {
    const db = await getDb();
    const totalRow = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM scan_history`,
    );
    const scamRow = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM scan_history WHERE verdict = 'scam'`,
    );
    const suspiciousRow = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM scan_history WHERE verdict = 'suspicious'`,
    );
    const lowRiskRow = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM scan_history WHERE verdict = 'low_risk'`,
    );

    return {
      total: totalRow?.count ?? 0,
      scamCount: scamRow?.count ?? 0,
      suspiciousCount: suspiciousRow?.count ?? 0,
      lowRiskCount: lowRiskRow?.count ?? 0,
    };
  } catch (err) {
    console.warn('Failed to compute scan stats:', err);
    return { total: 0, scamCount: 0, suspiciousCount: 0, lowRiskCount: 0 };
  }
}

/**
 * Purges all scan history records and reclaims storage space.
 */
export async function clearScanHistory(): Promise<void> {
  try {
    const db = await getDb();
    await db.execAsync(`DELETE FROM scan_history; VACUUM;`);
  } catch (err) {
    console.warn('Failed to clear scan history:', err);
  }
}
