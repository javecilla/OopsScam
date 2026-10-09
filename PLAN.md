# PLAN.md: development plan

Build window: **2:30 PM Oct 9 to 10:00 AM Oct 10, 2026** (about 19.5 hours). Demo Day is Oct 10 at Cyberzone, SM Makati.
Source of truth for scope and design: `docs/OopsScam — Product Requirements Document.md`. Update this file as tasks finish.

## Current task: Qwen scam/phishing classification

**Current step:** Qwen LoRA fine-tuning. The app is at Phase 3 validation, moving into Phase 4 polish. The requested Qwen classification change is not implemented. The shipped architecture still uses rules + ML for verdicts and pretrained Qwen for explanations.

Audit details and remaining requirement gaps: [requirements audit](docs/REQUIREMENTS-AUDIT.md). Update the checklist below as work is verified; a downloaded model, successful conversion, or passing ML evaluation does not prove Qwen was fine-tuned.

- [x] Inspect the pulled `main` at `c20120a` and preserve the team's dataset and training changes.
- [x] Identify which model was trained: `training/train.py` exports the TF-IDF/logistic-regression classifier; it does not train Qwen.
- [x] Check the requirements in all 12 `docs/*.md` files, plus SRS, PLAN, AGENTS, README and handoffs; record conflicts and unverified acceptance criteria.
- [x] Verify the pulled code: typecheck, lint and all 127 existing tests pass. No automated phone testing was run.
- [x] Inspect the canonical dataset schemas, labels and placeholders; distinguish spam labels from explicit smishing labels.
- [x] Identify evaluation contamination: the exported classifier is refitted on dev and real validation rows; the real-message report evaluates a separate model.
- [x] Record this tracking checklist and the requirements audit.
- [x] Prepare source-based Qwen targets: spam → Suspicious, explicit smishing/scam → Scam, ham/legit → Low risk; exclude 6,910 PH placeholders, quarantine 42 conflicting groups, and deduplicate. Raw files are unchanged. Human review of AI-written rows remains pending.
- [x] Reserve separate data by normalized message family: 7,467 train candidates, 1,000 tuning, 973 validation. No message family crosses splits or overlaps existing evaluation cases; the frozen `data/test_v2` hash is unchanged. Near-duplicate leakage beyond this family normalization is not certified.
- [x] Obtain approval for the new Qwen training dependencies, as required by AGENTS.md. Approved by the user; dependencies are declared separately in `training/qwen/requirements.txt`.
- [x] Set up `training/.qwen-venv` and measure actual CPU training: median 2.86 seconds per update over seven post-warmup samples; about 2.66 GB process memory. Estimated two-epoch training time is 2.3 hours, excluding evaluation/conversion. Dependency check passes; versions are recorded in `training/qwen/environment.lock.txt`.
- [ ] Fine-tune `Qwen/Qwen3-0.6B` on the prepared classification data; save the adapter, dataset hashes, configuration and actual training logs.
- [ ] Evaluate Qwen classification before and after fine-tuning on validation data; report failures and measured precision, recall and false alarms. Existing ML results do not measure Qwen.
- [ ] Merge the trained adapter, convert the trained checkpoint to GGUF, quantize to Q4_K_M and verify classification after quantization.
- [ ] Make validated Qwen inference determine the production classification, retain rule safeguards, and show an explicit error if classification fails. Remove ML verdict dependence from the production path.
- [ ] Update the affected product requirements, SRS, AGENTS and README to describe the resulting Qwen architecture and measured latency accurately.
- [ ] Run the relevant code checks, rebuild the release APK and provide steps for the user's manual phone tests.
- [ ] Confirm offline operation, actual Qwen-generated classifications and explanations, and manual phone acceptance before declaring the change complete.

**Not done:** Qwen fine-tuning, a custom trained GGUF, Qwen classification in the app, or full requirements acceptance. No commit or push is authorized for this new work.

Training uses 1,468 balanced examples drawn only from the training split (444 Scam, 512 Suspicious, 512 Low risk), including all three canonical public datasets and both synthetic files. It updates a 327,680-parameter LoRA adapter on Qwen's last eight attention layers, then merges it into Qwen for GGUF export; it does not retrain the separate ML classifier. The 96-message base-Qwen tuning smoke check measured 35.4% three-class accuracy and 93.8% false alarms. This is tuning evidence, not phone performance or a general benchmark. Artifacts and detailed logs are local in gitignored `training/qwen/artifacts/`.

## Assumptions (confirm and edit)

- [ ] Team of 3 to 4 people. With fewer, merge roles: Mobile + On-device, and Data + Rules. Cut from the bottom of the "If we fall behind" list.
- [ ] At least one machine has Android Studio, the Android SDK, the NDK and Java working. If not, installing them is task T2 and the 6:30 PM checkpoint is at risk.
- [ ] One demo phone (model, RAM and Android version: **\_\_**) and, ideally, a second phone as backup.

## Roles (from the PRD)

| Role                       | Owns                                                                               | Person |
| -------------------------- | ---------------------------------------------------------------------------------- | ------ |
| Data and ML                | Datasets and licenses, test set, classifier training and export, evaluation script |        |
| Rules and logic            | TypeScript rules, scoring, fusion, LLM prompt and JSON, unit tests                 |        |
| Mobile app                 | Expo screens, share menu, status strip, development build, release APK             |        |
| On-device modules and docs | llama.rn model setup, OCR and QR, README, X/LinkedIn post, submission              |        |

## Phase 1: set up and prove the risky parts (until the 6:30 PM checkpoint)

| ID  | Task                                                                                                         | Role        | Done when                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | Create the public GitHub repo, initialize the Expo TypeScript app, add `docs/PRD.md`, `AGENTS.md`, `PLAN.md` | Mobile      | First commit is pushed and the repo is public                                                                                               |
| T2  | Android build environment works                                                                              | Mobile      | `npx expo run:android` installs a hello screen on the demo phone                                                                            |
| T3  | Qwen3 0.6B runs through llama.rn on the phone                                                                | On-device   | One prompt returns valid JSON in 8 seconds or less with thinking off; the time is written here: \_\_\_\_ s                                  |
| T4  | OCR and QR use the **bundled** ML Kit models                                                                 | On-device   | After a fresh install in airplane mode, OCR reads a test screenshot and the camera reads a QR code; Gradle file checked                     |
| T5  | Share menu works                                                                                             | Mobile      | Sharing text from the messages app opens OopsScam with that text                                                                            |
| T6  | Datasets and test set started                                                                                | Data and ML | `data/sources.md` lists each dataset with its license; the plan for a 100-message test set (50 scam, 50 legitimate, team-written) is agreed |
| T7  | Rules v0 in `src/core` with unit tests                                                                       | Rules       | Tests pass for OTP request, lookalike domain, shortener, APK link and the real-OTP rule **Done: src/core, Jest tests pass.**                                                     |

**Checkpoint 1 (6:30 PM): go or no-go.** Freeze the test set. Decide fallbacks:

- T3 failed: ship templates-only explanations and keep the LLM as a stretch.
- T4 failed: paste and share only, no screenshot or QR.
- T2 failed: use an Expo cloud build (the local EAS build option is not available on Windows, as far as we know) or move the build to a working machine.

## Phase 2: core flow offline (6:30 PM to 10:30 PM)

| ID  | Task                                                       | Role           | Done when                                                                                                                       |
| --- | ---------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| T8  | Scoring, fusion and Taglish templates in `src/core`        | Rules          | Tests pass; thresholds 60 (Scam) and 30 (Suspicious) **Done: src/core, Jest tests pass.**                                                                            |
| T9  | Classifier trained, exported to JSON, scored in TypeScript | Data and ML    | TypeScript scores match Python on 20 sample messages **Done: 24 samples, max difference 6e-8. Trained without PH Spam (not downloaded).**                                                                            |
| T10 | LLM wrapper                                                | On-device      | JSON parsed safely, 8-second timeout, template fallback, LLM cannot lower a verdict **Done in code and Jest; not yet run on the phone.**                                             |
| T11 | UI: home screen and result screen                          | Mobile         | Text box, Paste, sample messages; result shows verdict word, score, highlighted flags, Taglish reason, next steps, status strip **Done in code (typecheck, lint, Metro bundle); not yet run on the phone.** |
| T12 | Wire it end to end                                         | Mobile + Rules | Share a fake GCash text: verdict within 1 second, explanation after, all in airplane mode **Wired in code; airplane-mode test on the phone still to do.**                                       |

**Checkpoint 2 (10:30 PM):** core flow works offline on the demo phone. Record a 30-second screen recording as a backup.

## Phase 3: more inputs and proof (10:30 PM to 3:00 AM)

| ID  | Task                                             | Role        | Done when                                                                            |
| --- | ------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------ |
| T13 | Screenshot checker                               | On-device   | **Done:** picked/shared images become editable OCR text and use the existing pipeline. Shared-image OCR, editing, analysis and blank-image errors verified on the Samsung A72. Picked screenshot read in 0.9 seconds and returned Scam (score 80); app-cache copies are deleted after decoding. |
| T14 | QR code checker                                  | On-device   | Implemented: camera and gallery QR decoding use the existing pipeline. Live camera scan confirmed by the user; a lookalike GCash link produced Scam. Gallery decoding retest pending. |
| T15 | Evaluation script                                | Data and ML | **Done:** prints precision, recall, false-alarm rate and laptop latency on the frozen `data/test_v2` set (the original `data/test` was never created). Results: [evaluation report](data/results/2026-10-09_test_v2.md); frozen hash and leakage checks pass. |
| T16 | Demo build without the INTERNET permission       | Mobile      | **Done:** standalone release APK rebuilt with bundled models; APK permission inspection confirms INTERNET and ACCESS_NETWORK_STATE are absent. `app.json` preserves these exclusions on prebuild. Shared OCR and camera QR exercised on the phone. |
| T17 | Practice mode (only if everything above is done) | Mobile      | Deferred: optional quiz stays out of the build while manual gallery QR verification is pending. |

**3:00 AM: feature freeze.** Only fixes after this.

## Phase 4: polish (3:00 AM to 6:00 AM)

- Fix bugs and tune thresholds on `data/dev` only. Never on `data/test`.
- Build the release APK and install it on a second phone.
- Pre-load models on both phones and test airplane mode again.
- Sleep in shifts; one person stays awake for fixes.

## Phase 5: submit (6:00 AM to 9:15 AM; hard deadline 10:00 AM)

| Task                                                                            | Done when                                                                   |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Record a demo video of about 1 minute                                           | File saved, plus a backup copy                                              |
| Post the video on X or LinkedIn, tagging Devin / Cognition, with #AppBuildersPH | Post URL copied                                                             |
| Finish `README.md` (see its checklist)                                          | Every disclosure section filled in, no TBD left                             |
| Test from a fresh clone                                                         | The build steps in the README work on a clean machine                       |
| Submit once on the Cerebral Valley event page                                   | Confirmation received by 9:15 AM; repo is public; no commits after 10:00 AM |

## Phase 6: Demo Day (Oct 10, Cyberzone, SM Makati)

- At least one teammate on site for registration at **12:00 PM**; AV checks at 12:15 PM; finalists announced around 1:00 PM; pitching from about 1:40 PM. Pitch is 5 minutes plus 3 minutes of judge Q&A.
- Bring: laptop, demo phone, backup phone, USB-C cable and any adapter, charger, the backup video.
- Practice mirroring the phone to the laptop before the event (for example with scrcpy). The venue provides Wi-Fi, power, HDMI and USB-C.
- Follow the demo script and the judge Q&A table in the PRD.

## Targets to measure (report only what we measure)

| Metric                              | Target                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------- |
| Scams flagged (recall)              | 90% or more                                                            |
| Legitimate messages wrongly flagged | 10% or less                                                            |
| Verdict time                        | 1 second or less                                                       |
| Explanation time                    | 8 seconds or less on the demo phone                                    |
| Network access                      | None: no INTERNET permission in the demo build, airplane mode on stage |

## If we fall behind: cut in this order

1. Practice mode and the optional pattern update
2. QR checker
3. Screenshot checker (then update the demo script)
4. ML classifier (run on rules alone)
5. LLM explanations (use templates)

Never cut: the rules engine, the real-OTP rule, the result screen, the offline demo, the README and the submission.

## Open questions

- [ ] Who is on the team, and who takes which role?
- [ ] Which Expo OCR and QR module lets us use the bundled models?
- [ ] Does Qwen3 0.6B write usable Taglish? If not, test Qwen3 1.7B.
- [ ] Which dataset licenses are confirmed (Mishra and Soni, Smishtank, and the two other Kaggle sets are not)?
- [ ] What are the WhiteCloak Award criteria? Ask the organizers in the Telegram group.
- [ ] Is it OK to involve anyone outside the team, even for testing? Ask the organizers first; outside help can disqualify a team.
