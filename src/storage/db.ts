import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Returns the lazily initialized SQLite database instance and ensures the
 * scan_history table is created.
 */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const db = await SQLite.openDatabaseAsync('oopsscam.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS scan_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      verdict TEXT NOT NULL,
      score INTEGER NOT NULL,
      flag_count INTEGER NOT NULL,
      flags_summary TEXT,
      snippet TEXT,
      input_type TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_scan_history_timestamp ON scan_history(timestamp DESC);
  `);

  dbInstance = db;
  return db;
}
