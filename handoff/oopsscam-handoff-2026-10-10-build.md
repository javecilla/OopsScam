# OopsScam Handoff — Build Session (2026-10-10, ~01:00 PHT)

Machine: `jerome` (Windows 10, PowerShell). Branch: `main`, last commit `7bc6409`
("Merge branch 'johnrey' (#10)"). Deadline: submit by 9:15 AM, Oct 10, 2026.

Read first: `AGENTS.md`, `PLAN.md`, `handoff/oopsscam-handoff-2026-10-09.md`, then this file.

---

## What was done this session

### 1. Merged PR #10 (johnrey → main)

GitHub's auto-merge check was hanging (121 files, many binaries — normal for large PRs).
Bypassed via command line:

```powershell
git checkout main
git pull origin main
git merge origin/johnrey   # fast-forward, zero conflicts
git push origin main
```

PR #10 is now merged and closed on GitHub. `main` is at `7bc6409`.

---

### 2. Built the app and got it running on the demo phone

**Phone:** Samsung Galaxy A72 (`SM_A725F`, device ID `R58RA34Z8NP`)

#### Environment fixes needed (all done, permanent)

| Problem | Fix applied |
|---------|------------|
| `ANDROID_HOME` not set | Set via `[System.Environment]::SetEnvironmentVariable` (User scope) → `C:\Users\jerom\AppData\Local\Android\Sdk` |
| `adb` not in PATH | Added `platform-tools` to User PATH permanently |
| `sdkmanager` not installed | Downloaded `commandlinetools-win-13114758_latest.zip` from Google, extracted to `C:\Users\jerom\AppData\Local\Android\Sdk\cmdline-tools\latest\` |
| NDK missing | Installed NDK `26.1.10909125` and `27.1.12297006` via sdkmanager (Expo requests 27.1) |
| SDK path not found by Gradle | Created `android/local.properties` with `sdk.dir=C\:\\Users\\jerom\\AppData\\Local\\Android\\Sdk` |
| **Java 24 incompatibility** | This was the main blocker. Java 24 (system default) blocks internal API calls used by NDK CMake during `llama.rn` compilation. Fixed by pointing Gradle to Android Studio's bundled **JDK 21**: added `org.gradle.java.home=C\:\\Program Files\\Android\\Android Studio\\jbr` to `android/gradle.properties` |
| Building 4 architectures (slow) | Changed `reactNativeArchitectures` to `arm64-v8a` only in `android/gradle.properties` |
| `node_modules` missing | `npm install` (run from PowerShell, not Git Bash — required for `llama.rn` postinstall) |

#### Build sequence that works

```powershell
# Run every time in a fresh PowerShell session:
$env:ANDROID_HOME = "C:\Users\jerom\AppData\Local\Android\Sdk"
$env:JAVA_HOME   = "C:\Program Files\Android\Android Studio\jbr"
$env:Path        = "$env:JAVA_HOME\bin;C:\Windows\System32;" + $env:Path + ";C:\Users\jerom\AppData\Local\Android\Sdk\platform-tools"

cd d:\Hackathon\OopsScam
npx expo run:android
```

First build: ~13 minutes. Subsequent builds: ~2 minutes (Gradle cache).

---

### 3. Bundled the Qwen model into the APK

**Previous approach (adb push):** model lived outside the APK; required manual `adb push` after every install.

**New approach (bundled):** model is packaged inside the APK. Works on any phone, no adb needed after install.

#### What was changed

**`android/app/src/main/assets/Qwen_Qwen3-0.6B-Q4_K_M.gguf`** (new, 462 MB)
- Copied from `models/Qwen_Qwen3-0.6B-Q4_K_M.gguf` into the Android assets folder.
- Gradle automatically packages everything in `android/app/src/main/assets/` into the APK.
- This folder is inside the generated `android/` directory — it **survives** as long as you don't re-run `npx expo prebuild` (which regenerates `android/`). If you re-prebuild, re-copy the file.

**`src/llm/llama.ts`** (modified)
- Added `ensureModelCopied()`: on first launch, copies the model from
  `asset:///Qwen_Qwen3-0.6B-Q4_K_M.gguf` (APK assets) to the app's document directory.
- Uses `expo-file-system/legacy` for `copyAsync` + `getInfoAsync` (the `asset:///` URI scheme).
- Uses `expo-file-system` (new API) `File` + `Paths.document` for the destination check.
- Added `'copying_model'` to the `LlmStatus` union type.
- `loadContext()` now calls `ensureModelCopied()` before `initLlama`.

**`src/pipeline.ts`** (modified)
- Added `copying_model: 'Copying model… (first launch)'` to the `LLM_LABEL` record to match the new status.

#### Final debug APK

- **Location:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **Size:** ~600 MB (462 MB model + ~138 MB app)
- **Installed on:** SM_A725F via `npx expo run:android`
- ⚠️ Requires Metro (`npm start`) to load JS — not suitable for distribution

---

## Current state

| Item | Status |
|------|--------|
| `main` branch | ✅ Up to date, all team branches merged |
| APK on demo phone (SM_A725F) | ✅ Installed, ~600 MB |
| Qwen model in APK | ✅ Bundled, auto-copies on first launch |
| `ANDROID_HOME` / `JAVA_HOME` / PATH | ✅ Set permanently (User scope) |
| NDK 27.1.12297006 | ✅ Installed |
| `android/local.properties` | ✅ Created |
| `android/gradle.properties` | ✅ Java 21 + arm64 only |
| **Release APK built** | ✅ `android/app/build/outputs/apk/release/app-release.apk` — 565.5 MB |
| **INTERNET permission removed** | ✅ Stripped via `tools:node="remove"` in AndroidManifest.xml (T16 done) |
| **ACCESS_NETWORK_STATE removed** | ✅ Also stripped |
| Release APK standalone | ✅ No Metro, no PC, no adb — installs and runs on any Android phone |
| Metro dev server | ⚠️ Only needed for debug builds — NOT needed for release APK |
| First-launch model copy | ⏳ ~30 sec on first open (one-time only) |
| Airplane-mode test (T12) | ❌ Not yet done — do this next |
| OCR / QR (T13, T14) | ❌ Not yet done |

---

## What to do next (priority order before 9:15 AM)

### Immediate — install and test the release APK

The release APK is the one to use from here on. Install it on the demo phone:

```powershell
$env:Path = $env:Path + ";C:\Users\jerom\AppData\Local\Android\Sdk\platform-tools"
adb install -r d:\Hackathon\OopsScam\android\app\build\outputs\apk\release\app-release.apk
```

Then test:
1. Open OopsScam — wait ~30 sec for first-launch model copy (status strip shows "Copying model…")
2. Paste a scam text and tap Analyze:
   - Verdict should appear in **< 1 second** (rules + classifier)
   - LLM Taglish explanation should appear in **< 8 seconds**
3. Turn on **airplane mode**, repeat step 2 — must work with no network
4. Confirm no internet permission: `adb shell dumpsys package com.oopsscam.app | Select-String "INTERNET"` → should return nothing

Sample scam text to test with:
```
GCash: Ang iyong account ay naka-flag para sa suspicious activity.
I-verify ngayon para maiwasan ang permanent suspension.
Ipadala ang iyong 6-digit OTP sa: 09XX-XXX-XXXX. Mag-expire sa 10 minuto.
```

5. If LLM is slow or crashes: set `USE_JSON_SCHEMA = false` in `src/llm/llama.ts`, rebuild release.

### How to rebuild the release APK (if needed)

```powershell
$env:ANDROID_HOME = "C:\Users\jerom\AppData\Local\Android\Sdk"
$env:JAVA_HOME   = "C:\Program Files\Android\Android Studio\jbr"
$env:Path        = "$env:JAVA_HOME\bin;C:\Windows\System32;" + $env:Path + ";C:\Users\jerom\AppData\Local\Android\Sdk\platform-tools"
cd d:\Hackathon\OopsScam\android
.\gradlew.bat app:assembleRelease -x lint -x test
# Output: android\app\build\outputs\apk\release\app-release.apk
```

Takes ~2 minutes (Gradle cache is warm).

### If you re-run prebuild (avoid if possible)

`npx expo prebuild` regenerates the entire `android/` folder, which **deletes** `android/app/src/main/assets/`. If you must prebuild:

```powershell
npx expo prebuild --platform android
New-Item -ItemType Directory -Path "android/app/src/main/assets" -Force
Copy-Item "models/Qwen_Qwen3-0.6B-Q4_K_M.gguf" "android/app/src/main/assets/"
```

Then rebuild with `npx expo run:android`.

---

## Key files changed this session

```
android/local.properties                        ← new: SDK path for Gradle
android/gradle.properties                       ← modified: Java 21, arm64-v8a only
android/app/src/main/assets/                   ← new directory
  Qwen_Qwen3-0.6B-Q4_K_M.gguf                ← 462 MB model bundled in APK
android/app/src/main/AndroidManifest.xml        ← modified: INTERNET + ACCESS_NETWORK_STATE removed
src/llm/llama.ts                                ← modified: ensureModelCopied(), copying_model status
src/pipeline.ts                                 ← modified: copying_model label added
```

## APK inventory

| APK | Location | Size | Use |
|-----|----------|------|-----|
| Debug | `android/app/build/outputs/apk/debug/app-debug.apk` | ~600 MB | Dev only — needs Metro |
| **Release** | `android/app/build/outputs/apk/release/app-release.apk` | **565.5 MB** | **Demo / submission — standalone, no INTERNET** |

---

## Gotchas learned this session

- **Java 24 breaks NDK CMake.** Always use `JAVA_HOME` pointing to Android Studio's JDK 21 (`C:\Program Files\Android\Android Studio\jbr`). The `org.gradle.java.home` property in `gradle.properties` enforces this for Gradle too.
- **`android/local.properties` is mandatory on Windows.** Setting `ANDROID_HOME` as an env var is not enough — Gradle's subprocess doesn't always inherit it. The `local.properties` file is the reliable way.
- **`expo run:android` in non-interactive mode skips the Metro server prompt.** If port 8081 is busy, it skips starting Metro rather than asking to use a different port. The APK still builds and installs, but you must run `npm start` separately to serve the JS.
- **`asset:///` URI scheme works with `expo-file-system/legacy` `copyAsync`.** Use `expo-file-system/legacy` for the `copyAsync` + `getInfoAsync` calls; use the new `expo-file-system` `File`/`Paths` API for the destination file check.
- **Re-prebuild deletes `android/app/src/main/assets/`.** Keep a copy of the model in `models/` (already there) and re-copy after any prebuild.
- **`emulator.backup` warning is harmless.** sdkmanager warns about a duplicate emulator folder on every run — ignore it.
