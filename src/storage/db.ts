import * as SQLite from 'expo-sqlite';

import { HISTORY_SCHEMA_VERSION, MIGRATE_HISTORY_SQL } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Removes deleted database pages and truncates committed WAL contents. */
export async function compactHistoryDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  const before = await db.getFirstAsync<{ busy: number }>('PRAGMA wal_checkpoint(TRUNCATE)');
  if (!before || before.busy !== 0) {
    throw new Error(
      'History cleanup is blocked by another database connection. Retry the operation.',
    );
  }
  await db.execAsync('VACUUM');
  const after = await db.getFirstAsync<{ busy: number }>('PRAGMA wal_checkpoint(TRUNCATE)');
  if (!after || after.busy !== 0) {
    throw new Error(
      'History cleanup could not truncate the database journal. Retry the operation.',
    );
  }
}

async function initializeDb(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('oopsscam.db');
  try {
    await db.execAsync('PRAGMA secure_delete = ON; PRAGMA journal_mode = WAL;');
    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if (
      !version ||
      !Number.isSafeInteger(version.user_version) ||
      version.user_version < 0 ||
      version.user_version > HISTORY_SCHEMA_VERSION
    ) {
      throw new Error('The history database version is unsupported. Use a compatible app version.');
    }
    if (version.user_version < HISTORY_SCHEMA_VERSION) {
      await db.withExclusiveTransactionAsync(async (txn) => {
        // Exclusive transactions use a separate connection with its own secure_delete setting.
        await txn.execAsync('PRAGMA secure_delete = ON;');
        await txn.execAsync(MIGRATE_HISTORY_SQL);
      });
      await compactHistoryDatabase(db);
      // Mark complete only after cleanup; interrupted cleanup is retried on the next open.
      await db.execAsync(`PRAGMA user_version = ${HISTORY_SCHEMA_VERSION}`);
    }
    return db;
  } catch (error) {
    await db.closeAsync();
    throw new Error('Could not initialize private scan history. Retry opening history.', {
      cause: error,
    });
  }
}

/** Shares initialization and migration across concurrent callers; a failed open can be retried. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = initializeDb().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}
