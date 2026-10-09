# Qwen classification continuation handoff

## Goal to carry forward

Audit all project requirements and the current dataset, training, and inference pipeline; clarify which model is trained and classifies scams; implement and verify the training and model changes needed for the user's requested Qwen-based scam/phishing classification, including a fine-tuned GGUF if feasible.

The requested end state is real Qwen fine-tuning on the project's eligible training data, a validated merged/quantized GGUF, and Qwen-generated scam/phishing classifications in the Android app with rule safeguards. Retraining logistic regression, downloading pretrained Qwen, or producing a GGUF alone does not satisfy this goal. Do not mark the goal complete until the actual app and artifacts prove the requested behavior.

## Read first and preserve

- Workspace: `D:\Hackathon\OopsScam`, Windows PowerShell. Read `AGENTS.md`, this handoff, `PLAN.md`, `docs/REQUIREMENTS-AUDIT.md`, the current PRD, SRS, and the email/SQLite/build handoffs.
- `docs/HANDOFF.md` referenced by AGENTS does not exist; handoffs are in `handoff/`. Several older documents describe obsolete implementation status.
- Branch at inspection: `jerome`, HEAD `310a612` (`Merge branch 'gwyn'`). Merges `686b727` and `1ff3a27` bring in SQLite history and Qwen preparation respectively. Reinspect branch and diff before editing: other developers have switched branches and committed during this session.
- Preserve the user's merged features and uncommitted review state. No commit or push is authorized for the current changes. Earlier push authorization applied to earlier work.
- Qwen architecture changes, new isolated training dependencies, and the multi-file implementation plan were approved. The user approved proceeding with metadata-only history after its conflict with the no-message-storage requirement was explained.
- The user stopped automated phone testing. Laptop checks/training are permitted; provide manual phone testing steps instead of operating the phone.
- App analysis must remain offline, with no INTERNET/ACCESS_NETWORK_STATE permission, cloud model, server, analytics, or silent ML classification fallback. Laptop-only downloads and loopback evaluation are permitted.
- Preserve public raw datasets byte-for-byte. Do not train or tune on frozen tests or acceptance validation. No private phone messages/screenshots enter the repo.
- Submission deadline in project documents: 10:00 AM Oct 10, target 9:15 AM. Do not weaken the requested architecture or claim unmeasured success to meet it.

## Authoritative current state

**Snapshot: Oct 10, 2026, approximately 4:37 AM PHT. Recheck live state; this is not a completion claim.**

The app still calls `src/pipeline.ts:runAnalysis`, which uses rules plus the SMS/email TF-IDF/logistic-regression classifier. Pretrained Qwen writes explanations. The Qwen classification helpers and new verified runtime are prepared but **not connected to the app**.

The existing release APK (`android/app/build/outputs/apk/release/app-release.apk`, last inspected build 2:47 AM, 614,268,974 bytes) predates the latest team merges and current changes. The bundled model remains `models/Qwen_Qwen3-0.6B-Q4_K_M.gguf` (484,220,320 bytes), the original pretrained GGUF. Do not call it our fine-tuned model.

### Training: one active run; do not start another

- Active command: `training/.qwen-venv/Scripts/python -u training/qwen/train.py`.
- Active run: `training/qwen/artifacts/runs/20261009T193535Z` (started 3:35 AM PHT).
- Last observed progress: epoch **1 of 2**, sample **1,139/1,468**. Metadata still says `training`; no selected completed run, validation report, merged weights, or custom GGUF exists yet.
- Launcher PID `19980`, worker PID `11608` were confirmed live. Both belong to the same training run, not two separate jobs. Revalidate PIDs and command lines before any action.
- Adapter checkpoints are saved every 16 examples in `latest/`; logs are in `training.jsonl`. No optimizer-state resume mechanism exists. Never assume rerunning `train.py` resumes: it creates a new run from the base model.
- The first run, `20261009T193121Z`, was explicitly stopped by the user at sample 336. Its checkpoint remains. Do not restart it or mistake its stale `training` metadata for a live process.
- Do not regenerate data, change training config/prompt, or restart merely because a poll times out. Check the live process and log first.

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -match 'python' -and $_.CommandLine -match 'training[/\\]qwen/train.py' } |
  Select-Object ProcessId, ParentProcessId, CreationDate, CommandLine
Get-Content training/qwen/artifacts/runs/20261009T193535Z/training.jsonl -Tail 1
Get-Content training/qwen/artifacts/runs/20261009T193535Z/metadata.json -TotalCount 20
Test-Path training/qwen/artifacts/selected_run.json
```

### Dataset/training facts already established

- Base: `Qwen/Qwen3-0.6B`, pinned revision `c1899de289a04d12100db370d81485cdf75e47ca`.
- Canonical sources: fictional `data/train/*.csv`, PH `text-messages.csv`, Tagalog SMS workbook, Mishra/Soni CSV. The active Qwen run does not include the newly merged email training data.
- Source labels: explicit scam/smishing/phishing => Scam; spam => Suspicious; ham/legit/OTP/notifications/ads/government => Low risk. This is source-label supervision, not human certification of every message.
- PH placeholders are excluded, 42 normalized conflicting groups quarantined, and 2,168 duplicate rows removed. Public raw files are unchanged.
- Family-separated candidates: 7,467 train, 1,000 tuning, 973 validation. Validation labels: 66 Scam, 150 Suspicious, 757 Low risk.
- Actual fitting subset: 1,468 examples (444 Scam, 512 Suspicious, 512 Low risk). LoRA trains 327,680 parameters on Qwen attention q/v projections in layers 20–27; two epochs, seed 42, gradient accumulation 8, rank 8, alpha 16, learning rate 0.0003, six CPU threads.
- A fixed 96-message tuning subset selects the best epoch. Acceptance validation is separate. The base-Qwen tuning smoke check measured 35.4% accuracy and 93.8% false alarms; it failed and is not a phone benchmark.
- Frozen `data/test_v2/test_v2.csv` SHA-256: `739af670b217dc7bc6081b0eefd81cba78ec05995b91bb34631ad8819fcba3df`. Do not alter it; it contains only 81 messages, below the original 100+ target.
- Human review of fictional/AI-written labels remains pending. Exact/family deduplication does not prove absence of semantic near-duplicates or cross-inbox generalization.

## Completed work and verification

- [x] Audit of all 12 `docs/*.md`, SRS, AGENTS, PLAN, README, and training/inference paths is recorded in `docs/REQUIREMENTS-AUDIT.md`.
- [x] Identified the trained shipped classifiers as logistic regression, not Qwen. Existing ML benchmark results are not Qwen evidence; exported SMS weights were refit on dev/real validation rows.
- [x] Installed approved Qwen training dependencies in `training/.qwen-venv`, downloaded the pinned base, prepared the split and measured CPU training throughput. Training is running, not complete.
- [x] Separate conversion environment `training/.gguf-venv` passes `pip check`; the pinned llama.cpp converter `--help` executes successfully.
- [x] Installed the already-declared `expo-sqlite` dependency locally. Preserved the team's original lockfile after npm rewrote unrelated metadata.
- [x] Excluded `training/qwen/llama.cpp` from app TypeScript/ESLint scanning. Typecheck passed after this correction.
- [x] Prepared pure `src/llm/analysis.ts`, strict `classify.ts`, and `src/core/qwen.ts`; Qwen label determines risk subject to the rules floor. ML probability is rejected in this path.
- [x] Added pure-code boundary tests in `src/core/__tests__/qwen.test.ts` and `src/llm/__tests__/classify.test.ts`. Final full run after the native/history edits passed **182 tests / 10 suites**. Typecheck passes; typed Jest imports and stop mocks match the existing test strategy.
- [x] Dataset leakage script passed for the current fictional train/dev/test/email groups. It does not certify raw public dataset near-duplicates.
- [x] Final Android Metro export after the history changes succeeded (1,349 modules); output is `C:\Users\jerom\AppData\Local\Temp\oopsscam-handoff-bundle-20261010043620`. This checks JS bundling, not native integration or phone behavior.
- [x] Final `npm run lint -- --no-cache` passed with no errors or warnings. Earlier cached lint retained a stale missing-SQLite failure. A broad `eslint .` also scans unrelated vendored skills/venvs; use the repository npm command.
- [x] GGUF evaluator binds model/data/prompt/adapter/training/merge/export hashes, rejects incomplete training and report overwrites, retries network failures, and reports typed three-class metrics and latency.
- [x] Added acceptance gates for both pooled flagged recall and **explicit Scam flagged recall >=90%**, plus Low-risk false alarms <=10%. Spam performance cannot hide missed explicitly labeled scams. Added the Scam metric to Python evaluation/export and Node evaluation.
- [x] Prepared `src/llm/qwen-runtime.ts`: validated sidecar manifest, exact training prompt, new cached model name, size/MD5 checks, native classification engine identified by model SHA-256, and shared native explanation adapter. This runtime has not been activated or tested on a phone.
- [x] Native explanation cancellation now returns an awaited promise, avoiding a swallowed stop error before another completion uses the context. Template explanation fallback remains authorized.

## Work underway / file ownership

Main-thread edits: `tsconfig.json`, `eslint.config.js`, Qwen tests, `src/llm/qwen-runtime.ts`, `src/llm/llama.ts`, `src/llm/explain.ts`, `training/qwen/evaluation.py`, `training/qwen/export.py`, and the Scam recall additions to `scripts/evaluate-qwen.ts`.

Subagent **Huygens** (`01a12255-807d-7fe3-9929-b0fbd42e0fe6`) finished `scripts/evaluate-qwen.ts` provenance/retry/typing improvements. It reported targeted TypeScript, ESLint, Prettier, and negative guard checks passed. Positive full inference remains unverified until a trained GGUF exists.

Subagent **Zeno** (`01a12259-4282-7e00-b98f-11c656be754a`) completed the metadata-only history fix and handed ownership back: `src/storage/db.ts`, `src/storage/history.ts`, `src/storage/schema.ts`, `app/history.tsx`, `app/result.tsx`. It removed message/snippet/flag-text storage, retains metadata, and surfaces save/load/clear errors. Targeted Prettier/ESLint and real Node SQLite migration, persistence, pruning, clearing, fresh initialization, interrupted-version retry, rollback, and blocked-checkpoint checks passed. Fictional sensitive markers were absent from the live database/WAL after cleanup. Main reviewed the current source and full typecheck/lint/tests/Metro pass. Manual native acceptance remains pending; this does not prove forensic erasure or removal from backups.

## Not done: exact next steps

1. **Reinspect authoritative state before continuing.** The history agent is complete and the final typecheck, lint, 182 tests, Python compilation, diff whitespace check, and Android Metro export pass. Read the current branch/diff and this handoff; repeat checks after new code edits, rather than assuming green laptop checks prove native/model acceptance. Preserve unrelated team changes.
2. **Finish the live Qwen run.** Poll it while doing independent work. A completed run writes `metadata.status=trained_not_validated`, both epoch reports, a selected `best/` adapter/tokenizer, and `artifacts/selected_run.json`. Loss alone is not accuracy evidence. Do not export `latest/` as a finished selected adapter.
3. **Validate the selected adapter once** using the command below. Inspect hashes, confusion matrix, per-class metrics, explicit Scam flagged recall, pooled flagged recall, false alarms, and latency. Require each relevant recall >=90% and false alarms <=10%. Do not tune on this validation set after seeing failures; report failures honestly and keep the model unactivated.
4. **Merge and export only if adapter validation passes.** The scripts enforce completed training, input/adapter/report provenance, pinned tooling, and metrics. They refuse output overwrites. Conversion produces BF16 followed by Q4_K_M under the selected run, never silently overwriting the old app model.
5. **Run the actual quantized GGUF evaluation.** Use laptop `serve.py` on loopback and `scripts/evaluate-qwen.ts`. Both Qwen-only and Qwen+rules must meet the gates. The server's SHA alias must match the model being evaluated. These are laptop timings, not Android timings.
6. **Implement verified packaging. This is still missing.** Create packaging tooling that checks the successful full GGUF report/provenance, then generates the real manifest and copies the custom GGUF to `models/`. No fake hashes or placeholder "validated" manifest. Preserve the original pretrained source file. `qwen-runtime.ts` requires:
   - Manifest APK asset `OopsScam-Qwen3-0.6B-Q4_K_M.json` with `status: "gguf_validated"`, `filename: "OopsScam-Qwen3-0.6B-Q4_K_M.gguf"`, `asset_filename: "Qwen_Qwen3-0.6B-Q4_K_M.gguf"`, actual `bytes`, SHA-256, MD5, and `classification_system_prompt` matching the trained prompt.
   - Update `plugins/with-bundled-model.cjs` to copy the verified new source model **over the existing APK asset path**, plus the manifest. This avoids bundling two 500 MB models and avoids deleting source files. On-device cache uses the new filename and verifies MD5/size, so old pretrained cache is not reused.
7. **Wire production Qwen classification. This is still missing.** Replace foreground `runAnalysis`/ResultScreen ML verdict dependence with awaited `runQwenAnalysis` using `loadVerifiedQwenRuntime`. Show checking/loading progress, clear classification failure and retry, and classification-model provenance. Do not display an ML verdict as a completed Qwen result. Coordinate cancellation, timeout, retry, and context cleanup; use one verified context for classification and explanation.
8. **Lock the explanation to the final verdict.** Current legacy `explain()` can still raise Low risk to Suspicious. For the Qwen path, prevent explanation generation from changing classification and use the authorized template if it contradicts the final result. Score is a risk indicator, not calibrated confidence. No ML classification fallback.
9. **Decide and validate merged feature coverage.** Current Qwen training is SMS-only; verify email behavior separately before claiming Qwen email coverage. The frozen 40-email ML report is 95% recall / 15% false alarms; this fails the 10% false-alarm target and is not Qwen evidence. Full mail-app screenshots may still route incorrectly. SMS background checks currently use rules+ML and are prohibited from running the LLM; explicitly reconcile/document this exception instead of hiding it or running Qwen in the background.
10. **Update requirements and disclosures** after actual architecture/metrics are known: AGENTS rule 3, SRS FR-ML/FR-FU/FR-LM and relevant PRDs currently mandate the previous hybrid architecture and some still forbid in-APK models. Clarify metadata-only history vs SEC-03; temporary image-cache lifecycle remains a separate privacy gap. New `qwen-runtime` manifest/packaging is preparation, not current app behavior.
11. **Build the new release APK only after code/model gates pass.** Native SQLite/SMS integration and merged APK permissions must be checked. Preserve no INTERNET/ACCESS_NETWORK_STATE/RECORD_AUDIO; inspect actual APK model bytes/hash. Review `android:allowBackup="true"` and configure appropriate backup exclusion/disablement for privacy. Do not claim removal of previously created external backups or forensic erasure.
12. **Give the user manual phone test steps.** Fresh-install/model copy, explicit Qwen classification provenance, Scam/Suspicious/Low-risk cases, genuine OTP, prompt injection, classification errors/retry/cancel, Taglish explanation source, airplane mode, pasted/shared text/email, OCR edits, gallery/live QR, metadata-only history/clear, and SMS acceptance tests. Record actual phone timings/output; no automated phone actions unless the user changes that instruction.
13. **Completion audit:** inspect every requested deliverable and acceptance condition; missing, indirect or unverified evidence remains incomplete. README team names, dataset review, screenshots, model/icon credits, fresh-clone build, phone latency, brand/font conformity, and submission/demo artifacts still need verification. Do not mark the persistent goal complete or push just because unit tests pass.

## Commands after training completes

Run from the repository root; dependent stages must remain sequential.

```powershell
# Validate once, then inspect results and gates before merging.
training/.qwen-venv/Scripts/python -u training/qwen/evaluate_adapter.py
training/.qwen-venv/Scripts/python -u training/qwen/merge.py
training/.gguf-venv/Scripts/python -u training/qwen/export.py

# Resolve the selected run; do not assume the stopped first run is selected.
$qwenRunPath = (Get-Content training/qwen/artifacts/selected_run.json -Raw | ConvertFrom-Json).run
$qwenGgufPath = Join-Path $qwenRunPath 'gguf/OopsScam-Qwen3-0.6B-Q4_K_M.gguf'
training/.qwen-venv/Scripts/python -u training/qwen/serve.py $qwenGgufPath
# In a separate terminal while that verified loopback server is live:
node --import ./scripts/ts-hooks.mjs scripts/evaluate-qwen.ts $qwenGgufPath (Join-Path $qwenRunPath 'gguf/validation.json')

npm run typecheck
npm run lint -- --no-cache
npm test -- --runInBand --watch=false
training/.qwen-venv/Scripts/python scripts/check_leakage.py
# Export JS to a temporary directory; native APK verification is still separate.
$qwenBundlePath = Join-Path $env:TEMP ('oopsscam-qwen-bundle-' + (Get-Date -Format 'yyyyMMddHHmmss'))
npx expo export --platform android --output-dir $qwenBundlePath
```

Android build setup is documented in the build handoff: Android Studio JBR 21, SDK `C:\Users\jerom\AppData\Local\Android\Sdk`, arm64 device. Existing bundling plugin survives prebuild; the old warning that every prebuild irretrievably loses the model predates that plugin. Inspect generated native state and the updated plugin before prebuild; do not blindly regenerate or install on the user's phone.

## Agent allocation if continuing in parallel

- Training/artifacts owner: monitor the **existing** run, verify completion/provenance, run adapter validation, merge/export, then actual GGUF evaluation. No duplicate train job.
- App owner: implement the verified packaging tool/plugin and asynchronous Qwen production path, progress/errors/cancellation, explanation locking, and honest timing/status. Coordinate model/manifest names with the artifacts owner.
- Requirements/verification owner: finish/review metadata-only history, reconcile docs and SMS background exception, run merged code/native checks, prepare manual acceptance steps. Never report unmeasured phone benchmarks.
- Main coordinator: preserve file ownership and branch/diff, review each result, keep PLAN current, and apply the full completion audit. Continue the original goal; do not replace it with a smaller ML-only or templates-only success criterion.
