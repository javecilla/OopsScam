# OopsScam handoff: email checking + false-alarm analysis (2026-10-10, ~04:00 PHT)

Repo: `E:\VSC\OopsScam` (machine `DESKTOP-SCI2UUD`), branch `gwyn`, last commit `b7e9bfa`. **Everything below is uncommitted and not pushed** (13 files modified, 11 new paths). Deadline: submit by 9:15 AM, Oct 10 (hard 10:00 AM).

Read first: `AGENTS.md`, `handoff/oopsscam-handoff-2026-10-10-build.md` (APK build steps), then this file.

## What was built: email checking

| Part | Files |
| --- | --- |
| Email dataset (Kuladeep P, Kaggle, CC BY-SA 4.0, LLM-generated), moved unchanged from `data/raw/kaggle/` | `data/raw/kd_email/phishing_legit_dataset_KD_10000.csv` (SHA-256 `fb65d38e...f1aa7`) |
| 46 fictional PH training emails (16 scam / 30 legit, incl. statements, OTPs, receipts, gov notices) | `data/train_email/emails_fictional.csv` |
| 40 fictional PH test emails (20 / 20), **frozen** before any training or rule change | `data/email_test/email_test.csv`, `data/email_test.FROZEN.md` (SHA-256 `375ff021...25f2`) |
| Email classifier training (reuses `train.py`; strips the dataset's `Subject:`/`Keywords:`/sign-off giveaways in memory; C=4) | `training/train_email.py` -> `assets/classifier_email.json` (223 KB, **CC BY-SA 4.0, not MIT**), `training/parity_email.json` |
| Email detection (`From:`/`Subject:` lines, or greeting first + sign-off last) and sender addresses | `src/core/email.ts` |
| Sender check: `From`/`Reply-To`/`Sender` address imitating a brand -> `sender_lookalike` (45 points, not a hard flag) | `src/core/rules.ts`, `types.ts`, `templates.ts` |
| Routing: email-like input -> email model; SMS model if the email weights fail to load | `src/pipeline.ts` |
| UI: "Sinuri bilang email." on the result; Home text mentions email; "Sample: pekeng BDO email" button | `app/result.tsx`, `app/index.tsx` |
| Evaluation: `email_test` set with the app's routing; leakage check covers the email sets | `scripts/evaluate.ts`, `scripts/check_leakage.py`, `data/results/2026-10-10_email_test.{md,json}` |
| Tests: email detection, sender check, email-model parity | `src/core/__tests__/email.test.ts`, `src/ml/__tests__/classifier.test.ts` |
| Docs: feature, dataset credit, CC BY-SA weights, results, Devin in AI-tools disclosure; commands | `README.md`, `data/sources.md`, `data/raw/README.md`, `AGENTS.md` |

The SMS model (`assets/classifier.json`) and `training/train.py` were **not** changed.

## Measured results

**Email test (40 AI-written emails, app = rules + classifier):** recall 95.0%, false alarms 15.0% (3 of 20, all Suspicious, none Scam). Above the 10% target; reported as-is. Reference only, nothing tuned on it: rules alone 85% / 5%; SMS model for every email 95% / 35%.

- False alarms: `em-l013` SSS payment posted (classifier), `em-l014` job-application reply ("we never charge any fee" trips `fee_request`, "hiring" trips `job_loan_investment`), `em-l017` friend's Taglish GCash share (classifier).
- Missed: `em-s015` boss asking for gift cards.

**SMS unchanged:** dev, test_v2 and adversarial results are identical field by field to the committed files. No message in any SMS set, including 10,361 real public SMS, is routed to the email model or has a sender line.

**Classifier confidence (classifier alone, threshold 50%):**

| | SMS classifier | Email classifier |
| --- | --- | --- |
| 868 real PH texts it never saw (model retrained without them) | accuracy 97.4%, recall 96.1%, false alarms 2.1% | 97.1%, 95.7%, 2.3% (SMS, not emails) |
| Frozen AI-written test set | test_v2: 96.3%, 100%, 7.5% | email_test: 87.5%, 95%, 20% |
| Confident scores (>=90% or <10%) | 89% of real texts, right 98.7% | 60% of test emails, right 23 of 24 |

SMS score vs reality on the real texts: >=90% -> 98% scams; 70-90% -> 89%; 50-70% -> 50%; 30-50% -> 17%; <10% -> 1%. The app does not show this probability; its 0-100 score is 60% rules + 40% classifier.

## False-alarm findings (analysis only, nothing changed)

1. **The rules cause most real-world false alarms.** On the 868 real PH texts the app wrongly flags 37 of 613 legit (6.0%); 19 of those stay flagged even if the classifier said 0%. Top flags: `unknown_link` (29), `brand_link_mismatch` (12), `prize` (9). The classifier alone does better than the whole app (96.1% / 2.1% vs 94.1% / 6.0%), so retuning the 60/40 blend on dev + real held-out is the biggest lever.
2. **Mishra & Soni label bug:** their 489 `spam` rows are mostly old UK marketing texts (like UCI) and `train.py` maps them to scam. Dropping them: real false alarms 37 -> 35, dev 4 -> 3 (one more dev scam missed). Not applied.
3. **The dev report is optimistic:** the shipped SMS model is trained on `data/dev`, so `2026-10-10_dev.md` (2.2% false alarms) is not held out; with dev held out it is 8.9%. The README does not quote it.
4. **The Kaggle email set does not help the SMS model** (real false alarms 37 -> 35/36, recall down 1-2 scams), which is why it only trains the separate email model.
5. **Other datasets checked:** bwandowando "Philippine Spam/Scam SMS" is CC BY-NC-SA 4.0 and scam-only (no help for false alarms); Smishtank has no license found (dataset page 404), US-centric, scam-only.

## Checks run (on this machine)

- `npx jest`: 7 suites, 168 tests pass. `python scripts/check_leakage.py`: PASS, no near-duplicates.
- `npx expo export --platform android`: Metro bundles (1,311 modules).
- `npm run typecheck`: only the 3 pre-existing route-type errors (stale local `.expo/types/router.d.ts`). `npm run lint`: only the 2 pre-existing `expo-camera` `import/no-unresolved` errors. Both match `data/raw/verification/`.

## Not done

1. **Review and commit** (AGENTS: no commit/push unless asked). Commit `data/raw/kd_email/`; the empty `data/raw/kaggle/` folder was removed.
2. **Rebuild the release APK on the build laptop** (`handoff/oopsscam-handoff-2026-10-10-build.md`) and test on the phone in airplane mode: the BDO email sample should show "Sinuri bilang email." and a sender flag; the SMS samples should behave as before. The phone still has the old build.
3. **Email screenshots (OCR) only partly work.** OCR text runs through all rules, but typical phone screenshots (clock on top, Reply/Forward at the bottom, sender shown as "BDO Unibank" / "to me" / `Name <address>`) are not detected as email, so they use the SMS model and the sender check does not run. Only `From:` headers and body-only crops are detected. Possible fix: treat mail-app markers as email and check `Name <address>` / `Name • address` lines; test with a self-sent copy of the fictional sample (do not commit that screenshot, it shows your address).
4. **Team review of the AI-written data**, now including the email sets (README TODO).
5. Later, tuned on dev only: fusion blend, Mishra & Soni labels, `fee_request` negation ("no fee"), unverified brand domains (`data/TODO-verify-domains.md`). Build an email dev set before tuning anything for emails.

## Gotchas

- **Never edit `data/email_test`** (frozen hash) and never tune on it or on `test_v2`. New email tests go in `email_test_v2`.
- `train_email.py` imports `train.py`: changing features, `RAW_DIRS` or `normalize` there affects both models. Retrain both and re-run `npx jest` (parity tests).
- `scripts/evaluate.ts` overwrites `data/results/<today>_<set>.*`. Re-running the SMS sets rewrites their files (new latency numbers and the new routing line); restore with `git checkout -- data/results/...` if you only wanted the email results.
- The working tree is CRLF (`core.autocrlf=true`), so `npx prettier --check` flags every file; use `--end-of-line auto` to see real issues.
- `assets/classifier_email.json` is CC BY-SA 4.0 because of its training data; keep the README license note if you retrain it.

## Commands

```
python training/train_email.py
node --import ./scripts/ts-hooks.mjs scripts/evaluate.ts email_test
python scripts/check_leakage.py
npx jest
```
