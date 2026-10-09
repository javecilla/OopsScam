# OopsScam Handoff — SQLite Storage Session (2026-10-10, ~03:55 PHT)

**Machine / Branch:** `raizel` (up to date with `origin/raizel` / `origin/main`).  
**Hackathon Deadline:** Submit by **9:15 AM, Oct 10, 2026** (Hard cutoff: 10:00 AM).  
**Context:** Connect on-device SQLite database to persist scan history without violating SEC-03 (zero-PII / zero disk leaks).

Read first: `AGENTS.md`, `PLAN.md`, `handoff/oopsscam-handoff-2026-10-10-build.md`, then this file.

---

## 1. What was done this session

### A. SQLite Package & Config Installed
* Installed `expo-sqlite@~57.0.4` via Expo CLI.
* Registered plugin `"expo-sqlite"` in `app.json`.
* Ensured `blockedPermissions` (`INTERNET`, `ACCESS_NETWORK_STATE`, `RECORD_AUDIO`) remain strictly enforced.
* Credited `expo-sqlite` under "Technology and credits" in `README.md`.

### B. Privacy-Preserving Storage Layer (`src/storage/`)
* **`src/storage/db.ts`**:
  * Lazily initializes `oopsscam.db` via `expo-sqlite`.
  * Configures WAL journal mode (`PRAGMA journal_mode = WAL`) for fast non-blocking writes.
  * Automatically creates table `scan_history` and timestamp index on first launch.
* **`src/storage/history.ts`**:
  * **Option A Privacy Compliance**: All scanned snippets pass through `sanitizeSnippet()`, automatically redacting potential OTPs/PINs (`\b\d{4,8}\b` $\to$ `[CODE]`) before hitting SQLite disk.
  * Auto-prunes older records to retain only the most recent 100 scans, preventing device storage bloat.
  * Provides async helper APIs: `saveScanRecord()`, `getRecentScans()`, `getScanStats()`, and `clearScanHistory()`.

### C. Pipeline & UI Integration
* **`app/result.tsx`**:
  * Automatically records scan events (verdict, score, flag count, sanitized snippet, input type) asynchronously in the background.
  * If the user waits for the local LLM explanation and the verdict is raised, the final raised verdict is stored. If they navigate away immediately, the deterministic rule+classifier result is preserved.
* **`app/screenshot.tsx` & `app/qr.tsx`**:
  * Passes `inputType: 'image'` and `inputType: 'qr'` so records show their origin.
* **`app/history.tsx`** (New Screen):
  * Displays quick aggregate stats (Total Scans, Scam count, Suspicious count, Low risk count).
  * Lists previous scans with badges (`SCAM`, `SUSPICIOUS`, `LOW RISK`), timestamps, score, input type tag (`[TEXT]`, `[IMAGE]`, `[QR]`), and sanitized snippets.
  * Features a **"Burahin ang Kasaysayan"** button (with alert confirmation and SQLite `VACUUM` reclaim).
* **`app/index.tsx`**:
  * Added **"Tingnan ang Scan History"** button.
* **`app/_layout.tsx`**:
  * Added `history` route to Expo Router stack.

---

## 2. Table Schema (`scan_history`)

```sql
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
```

---

## 3. Verification & Checks Performed

| Check | Command | Result |
|---|---|---|
| **TypeScript Typecheck** | `npm run typecheck` (`tsc --noEmit`) | ✅ **0 errors** |
| **Pure TS Engine Evaluation** | `node --import ./scripts/ts-hooks.mjs scripts/evaluate.ts test_v2` | ✅ **97.6% recall**, **93.0% precision**, latency 0.03 ms |
| **Data Leakage Check** | `python scripts/check_leakage.py` | ✅ **PASS** (Zero duplicates across datasets) |
| **Git Safety Check** | `git status`, `git diff` | ✅ **Clean**, no stray artifacts or secrets |

---

## 4. How to Rebuild the Standalone Release APK

Dahil nagdagdag ng bagong native dependency (`expo-sqlite`), kailangang i-rebuild ang standalone Release APK gamit ang Gradle:

```powershell
# In PowerShell (use Android Studio JDK 21):
$env:ANDROID_HOME = "C:\Users\jerom\AppData\Local\Android\Sdk" # adjust per machine
$env:JAVA_HOME   = "C:\Program Files\Android\Android Studio\jbr"
$env:Path        = "$env:JAVA_HOME\bin;C:\Windows\System32;" + $env:Path + ";$env:ANDROID_HOME\platform-tools"

cd android
.\gradlew.bat app:assembleRelease -x lint -x test
```

> ⚠️ **IMPORTANT PREBUILD WARNING**:
> Huwag patakbuhin ang `npx expo prebuild` dahil buburahin nito ang `android/app/src/main/assets/Qwen_Qwen3-0.6B-Q4_K_M.gguf`. Diretso lamang sa `gradlew.bat app:assembleRelease`.

Output APK location:
`android/app/build/outputs/apk/release/app-release.apk`

---

## 5. Next Priorities Before 9:15 AM Deadline

1. **Physical Device Smoke Test**:
   * Install release APK: `adb install -r android/app/build/outputs/apk/release/app-release.apk`.
   * Test in Airplane mode: scan a text, check History screen, and test Clear History button.
2. **Demo Video (~1 min)**:
   * Screen recording of analyzing a fake GCash alert, viewing history, and demonstrating that no internet is needed.
3. **Social Post**:
   * X / LinkedIn post tagging Cognition / Devin (#AppBuildersPH).
4. **README Disclosure Cleanup**:
   * Add 3 app screenshots to `README.md`.
5. **Cerebral Valley Submission**:
   * Submit public repo before 9:15 AM.
