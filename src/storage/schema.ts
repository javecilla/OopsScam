export const HISTORY_SCHEMA_VERSION = 2;

const METADATA_COLUMNS = `
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL CHECK (timestamp >= 0),
  verdict TEXT NOT NULL CHECK (verdict IN ('scam', 'suspicious', 'low_risk')),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  flag_count INTEGER NOT NULL CHECK (flag_count >= 0),
  input_type TEXT NOT NULL CHECK (input_type IN ('text', 'image', 'qr'))
`;

/** Run inside a transaction with secure_delete enabled, then checkpoint and vacuum outside it. */
export const MIGRATE_HISTORY_SQL = `
  CREATE TABLE IF NOT EXISTS scan_history (${METADATA_COLUMNS});
  CREATE TABLE scan_history_metadata (${METADATA_COLUMNS});
  INSERT INTO scan_history_metadata (id, timestamp, verdict, score, flag_count, input_type)
    SELECT id, timestamp, verdict, score, flag_count, input_type FROM scan_history;
  DROP TABLE scan_history;
  ALTER TABLE scan_history_metadata RENAME TO scan_history;
  CREATE INDEX idx_scan_history_timestamp ON scan_history(timestamp DESC);
`;
