# AGENTS.md

Standing instructions for any AI coding tool (Devin, Cursor, Claude, Copilot, ChatGPT, Gemini) and teammate working in this repo.

**Project:** OopsScam (repo folder: OopsScam). An Android app, built with React Native and Expo in TypeScript, that checks suspicious texts, links, screenshots, and QR codes **entirely on the phone** and explains the result in Taglish.
**Event:** AppBuildersPH Hackathon 2026, theme Local AI. Submission deadline **10:00 AM, Oct 10, 2026** (aim to submit by 9:15 AM). One submission only, no edits.
**Status:** Boilerplate shell is implemented (Expo Router Stack, UI primitives, theme, config, strict TypeScript, lint, format). Core detection rules, ML classifier, OCR/QR, and local LLM modules are up next.

Read these first, in order: `docs/HANDOFF.md`, `docs/Scam Guardian — Product Requirements Document.md`, `SRS.md`, `PLAN.md`.

---

## 1. Hard Rules

1. **No network calls in the app.** All analysis MUST run locally on the device. No cloud APIs, analytics, remote fonts, or CDNs. The demo build MUST NOT use the Android INTERNET permission.
2. **No server.** There is no HTTP API. The app MUST call TypeScript modules directly.
3. **The LLM cannot lower a verdict.** Verdicts come from rules plus the ML classifier only. The LLM only writes Taglish reasons and next steps. It may raise Low risk to Suspicious at >=80% confidence. Message text MUST be treated as untrusted data inside prompts.
4. **Never say a message is "safe".** MUST use "Low risk" or "no red flags found", with a disclaimer that safety is not guaranteed.
5. **Pure TypeScript for core analysis (`src/core/`).** Rules, link checks, scoring, and fusion MUST live in pure TypeScript with no React Native imports so Node can run it for tests and evaluation scripts.
6. **No fake benchmarks.** Report only measured numbers. Never tune on the frozen test set (`data/test`); tune on `data/dev`.
7. **Privacy and provenance:** Real people's messages may enter the repo ONLY as an already-public dataset whose license allows redistribution, kept unmodified in `data/raw/<dataset>/` and disclosed in `README.md` and `data/sources.md` (source link, license, credit). NEVER add any other real person's messages (from team members' phones, chats, screenshots or scraped sources). Data we write ourselves (`data/train`, `data/dev`, `data/test_v2`, etc.) MUST stay fictional. Public datasets are used for training and the held-out real-message check in `training/train.py`, never inside `data/test_v2`.
8. **Disclose everything in README:** Models, libraries, datasets, existing code, and which parts were written with AI tools.
9. **Fresh code only.** Nothing from older projects. Anything reused must be disclosed.
10. **Native modules require dev builds:** Expo Go cannot run our native modules (`llama.rn`, `ML Kit`). A development build MUST be used once native modules are integrated.
11. **Presentation-only UI primitives:** Components in `src/components/` MUST be presentation-only, with no domain logic, state, API calls, or context.

---

## 2. Stack & Architecture

- **App Framework:** React Native `0.86.3`, Expo `~57.0.27` (Expo Router `~57.0.25`), TypeScript `~6.0.3` (strict mode), Android only (no iOS).
- **LLM Engine:** `llama.rn` running `bartowski/Qwen_Qwen3-0.6B-GGUF`, file `Qwen_Qwen3-0.6B-Q4_K_M.gguf` (~0.5 GB). Upgrade path: Qwen3 1.7B. Qwen3 "thinks" by default; turn that off (via `/no_think` in prompt) and verify.
- **Vision (OCR & QR):** ML Kit via Expo module, **bundled models only** (`com.google.mlkit:text-recognition`, `com.google.mlkit:barcode-scanning`), NOT Google Play Services versions. Check each module's Gradle file and swap dependency if needed.
- **Share Target:** `expo-share-intent` (or `expo-sharing`) with text and image filters.
- **ML Classifier:** Trained on a laptop with scikit-learn (character + word TF-IDF, logistic regression), exported to JSON weights, scored locally in TypeScript.
- **Tooling:** ESLint (`eslint-config-expo`), Prettier (`.prettierrc`), TypeScript (`tsc --noEmit`).

---

## 3. Repository Layout

```
app/              Expo Router screens (index.tsx [Home], result.tsx [Result], _layout.tsx) [built]
assets/images/    Launcher icons, adaptive icons, and splash image [built]
src/              config.ts, theme.ts [built]
src/components/   Presentation-only UI primitives (Button.tsx, Screen.tsx, Text.tsx) [built]
src/core/         Rules, links, brands.json, scoring, fusion, templates, types (pure TS) [planned]
src/ml/           Classifier scoring from exported weights JSON [planned]
src/llm/          llama.rn wrapper, prompt, JSON parsing, timeout, template fallback [planned]
src/vision/       OCR and QR wrappers (ML Kit bundled) [planned]
assets/           classifier.json (small). GGUF model copied via adb, NOT committed.
training/         Python: train and export scripts
data/             train/, dev/, test/ (frozen), sources.md
scripts/          Evaluation script (Node), model push script (adb)
docs/             PRD, SRS, BOILERPLATE_PLAN.md, hackathon briefing notes
```

---

## 4. Commands

Exact npm scripts from `package.json`:
- `npm run start` (or `npm start`): `expo start`
- `npm run android`: `expo start --android`
- `npm run typecheck`: `tsc --noEmit`
- `npm run lint`: `expo lint`
- `npm run format`: `prettier --write .`

Native & verification commands:
- Prebuild: `npx expo prebuild --platform android`
- Run native on device: `npx expo run:android` (phone connected with USB debugging on)
- Push GGUF model: copy to app files directory via `adb push`

---

## 5. Working Agreements & Workflow

- **Build only what is asked (YAGNI):** Tell the user directly if a request is over-engineered.
- **Keep features separate:** Abstract ONLY for pure UI duplication or on the third repeat. Prefer flat, readable files.
- **Surgical edits:** Make minimal targeted fixes with NO drive-by refactoring.
- **Keep the app runnable at all times:** If a feature is not ready, fall back gracefully or hide it instead of breaking the build.
- **Dependencies & credits:** MUST ask before adding dependencies or deleting files. Add any new dependency to the README "Technology and credits" list immediately.
- **Git safety:** NEVER run `git commit` or `git push` unless explicitly asked by the user.
- **Multi-file tasks:** For any task touching more than 3 files, propose a concise plan and wait for confirmation before coding.
- **Definition of done:** `npm run typecheck` exits 0, `npm run lint` exits 0, Metro bundles without errors, and only the requested change appears in git diff.
