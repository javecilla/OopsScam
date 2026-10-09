# OopsScam handoff (2026-10-09, ~23:30 PHT)

Repo: `D:\Coding\Hackathon\OopsScam`, branch `johnrey`, last commit `ff12dc3` ("Add core analysis pipeline, app screens and evaluation data"). Not pushed. Deadline: submit by 9:15 AM, Oct 10 (hard 10:00 AM).

Read first: `AGENTS.md` (hard rules and workflow: ask before adding deps or deleting files, plan before touching more than 3 files, never commit/push unless asked), then `PLAN.md` (task status), `SRS.md`, `README.md`, `data/sources.md`.

## State

- **Done in code:** PLAN T7–T12 (rules, scoring/fusion/templates, classifier, LLM wrapper, Home/Result screens, share intent, status strip). See `src/core`, `src/ml`, `src/llm`, `src/pipeline.ts`, `app/`.
- **Evaluation data + scripts** (from a pasted task brief): dev, frozen `test_v2`, adversarial, LLM check set, patterns, brand list, images, leakage check, evaluation script. See `data/sources.md`, `data/test_v2.FROZEN.md`, `data/patterns/ph_scam_patterns.md`, `data/TODO-verify-domains.md`, `data/results/2026-10-09_*.md`.
- **Checks passing at commit:** `npm test` (127), `npm run typecheck`, `npm run lint`, `python scripts/check_leakage.py`, `npx expo export --platform android` (Metro bundle).
- **Measured** (`data/results/`): app recall 97.9% dev / 97.6% test_v2; false alarms 13.3% dev (over the 10% target, all from the classifier) / 7.5% test_v2. Report as-is; tune only on `data/dev`, never `test_v2`.

## Not done / not verified

1. **Nothing has run on a phone.** No adb on this machine. Needed: `npx expo prebuild --platform android`, `npx expo run:android`, `git lfs pull` on main for the GGUF, `bash scripts/push-model.sh models/Qwen_Qwen3-0.6B-Q4_K_M.gguf` (debug builds only; uses `run-as com.oopsscam.app`). Then the T12 airplane-mode test and LLM timing. If LLM output is slow or broken, set `USE_JSON_SCHEMA = false` in `src/llm/llama.ts`.
2. **Branch is 2 commits behind `origin/main`** (GGUF via LFS, fonts/favicons). Merge before building; `.gitattributes` will conflict trivially (keep both lines).
3. **README says the AI-written data was "reviewed by the team"** (wording the user requested). It has not been reviewed yet; review it or reword before submission.
4. **19 brand domains unverified** (`data/TODO-verify-domains.md`). CICC hotline 1326 in `src/core/templates.ts` should also be checked.
5. **Classifier not retrained** after the new data; `assets/classifier.json` is unchanged. Rerunning `training/train.py` will now use `data/dev` for tuning plus the new train rows (venv: `training/.venv`).
6. **Phase 3 still open:** T13 OCR, T14 QR (test images exist in `data/images/`), T16 demo build without INTERNET permission (Expo defaults still include it), README TODOs, demo video, submission.
7. `data/test` (the original frozen set from PLAN) never existed; `test_v2` is the only held-out set.

## Gotchas learned this session

- llama.rn: npm `latest` is a release candidate, so it is pinned to `0.12.9`. Its postinstall fails under Git Bash's GNU tar on Windows; install with `C:\Windows\System32` first in PATH, or from PowerShell.
- The expo-share-intent plugin crashes prebuild on Android-only apps unless `disableIOS: true` (already set in `app.json`).
- The React Compiler lint rule forbids synchronous setState inside effects (see the patterns used in `app/index.tsx` and `app/result.tsx`).
- `core.autocrlf=true`: `.gitattributes` pins `data/**/*.csv` and `*.jsonl` to LF so the frozen hash stays valid. Check with `git show HEAD:data/test_v2/test_v2.csv | sha256sum`.
- Evaluation runs TypeScript directly: `node --import ./scripts/ts-hooks.mjs scripts/evaluate.ts [dev|test_v2|adversarial]`.
- Do not commit `.claude/settings.json` (local config).

## Suggested skills

- `superpowers:verification-before-completion`: before claiming anything works, especially on-device steps.
- `superpowers:systematic-debugging`: for build, prebuild or llama.rn failures on the phone.
- `run`: to launch and check the app once a device or emulator is available.
- `superpowers:test-driven-development`: for T13/T14 or any rule fix (tune on dev only).
- `superpowers:writing-plans`: AGENTS requires a plan before touching more than 3 files.
- `code-review` or `superpowers:requesting-code-review`: before merging `johnrey` into main.
- `superpowers:finishing-a-development-branch`: for the merge/PR step.
