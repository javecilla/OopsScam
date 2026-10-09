# Requirements and model audit

Current inspected revision: `c20120a` on `main`. This audit distinguishes implemented code from measured acceptance; it does not certify submission readiness. Track the requested Qwen work in [PLAN.md](../PLAN.md#current-task-qwen-scamphishing-classification).

## Which model was trained?

| Component | Current role | Training / verification evidence |
| --- | --- | --- |
| Rules in `src/core` | Detect flags and calculate a rules score | Pure TypeScript, covered by existing tests |
| `assets/classifier.json` | TF-IDF/logistic-regression scam probability, fused with rules | Exported by `training/train.py`; updated in the pulled commit. SHA-256: `73ef34aa7ec41e3fc98a4e1da909e4c5215c8c2b4a7cbaf4c27424d7d14fda79` |
| Shipped Qwen3 0.6B GGUF | Taglish explanation; limited Low risk-to-Suspicious override | The app still loads the pretrained quantization. The approved `training/qwen/` LoRA run is in progress; its checkpoints have not passed validation or been integrated into the app |
| `scripts/evaluate.ts` | Evaluate rules + ML classifier | Does not execute or evaluate Qwen |

`src/pipeline.ts` calls `analyze(text, classifier?.score)` for the verdict. The Qwen prompt receives that verdict and asks it to explain it. `applyLlmOpinion` cannot promote a verdict to Scam. Therefore, changing `assets/classifier.json` changes the ML model, not Qwen.

The current architecture follows AGENTS rule 3, SRS FR-ML-01 and FR-FU-04/05, and both PRDs. The user's request for Qwen classification changes that architecture. The hackathon briefing requires meaningful local inference and disclosure; it does not require teams to fine-tune an LLM or use Qwen as the classifier.

Fine-tuning changes model weights through training. GGUF conversion changes their storage format, and quantization reduces their numerical precision; neither proves training occurred. The intended sequence is reviewed classification data → Qwen fine-tuning → validation → adapter merge → GGUF conversion/quantization → validation → app integration. See the [Qwen model card](https://huggingface.co/Qwen/Qwen3-0.6B), [PEFT adapter merge documentation](https://huggingface.co/docs/peft/developer_guides/lora), and [llama.cpp conversion/quantization documentation](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md).

## Dataset findings

| Input | Inspected rows / labels | Training implications |
| --- | --- | --- |
| `data/raw/ph_spam/text-messages.csv` | 8,895 records; 6,887 `<REDACTED>`, 23 `<BLANK>`, and 2 malformed records | The trainer excludes `<REDACTED>` but still admits `<BLANK>`. Placeholders provide no message content and have contradictory labels. Exclude them before deduplication or splitting |
| `data/raw/tagalog_sms/tagalog-sms.xlsx` | 3,454 records: 645 spam, 178 ads, 79 gov, 2,039 notifs, 513 otp | Spam is not an explicit phishing label; review positives against the intended fraud definition |
| `data/raw/mishra_soni/Dataset_5971.csv` | 5,971 records: 4,844 ham, 489 spam, 638 smishing | Preserve the distinction between spam and explicit smishing rather than merging both without disclosure |
| Local UCI collection | 5,574 records: 4,827 ham, 747 spam | Current trainer disables UCI. Do not reintroduce it automatically; spam labels are broader than fraud labels |
| `data/train/*.csv` | 248 fictional AI-written records | Useful PH patterns; team review remains pending per `data/sources.md` |
| `data/dev/dev.csv` | 92 fictional records | Tuning data, not independent proof after inclusion in model fitting |
| Frozen `data/test_v2/test_v2.csv` | 81 records: 41 scam, 40 legitimate | Below the PRD target of 100+. Do not modify this frozen set or tune on it to satisfy the target |

The PH dataset author explicitly defines spam as unsolicited messages and documents redaction of OTP/notification content: [dataset definitions](https://raw.githubusercontent.com/scottleechua/data/main/spam-and-marketing-sms/README.md). Mishra & Soni publish separate ham, spam and smishing labels under CC BY 4.0: [primary dataset page](https://data.mendeley.com/datasets/f45bkkt8pr/1). Tagalog-SMS's CC0: Public Domain license was independently reconfirmed through the [official Kaggle metadata API](https://www.kaggle.com/api/v1/datasets/view/onzero0/tagalog-sms).

A local, untracked `data/raw/ph_spam/ph_spam_marketing.csv` is also present. It is a transformed copy produced by the older fetch helper. The trainer globs all CSVs in that directory, so this machine's inputs differ from a fresh clone. Keep the file untouched; use explicit canonical inputs in the next reproducible training pipeline.

The frozen set's inspected SHA-256 remains `739af670b217dc7bc6081b0eefd81cba78ec05995b91bb34631ad8819fcba3df`. Cross-source duplicate, normalized-label-conflict and leakage checks must be repeated on the newly pulled corpus. The existing leakage checker excludes `data/raw`, so it alone cannot certify external-data separation.

## Evaluation limitations

- The current trainer chooses C on synthetic dev and the real-data split, then refits the exported classifier on all data, including both splits. The committed dev report's 100% recall and 2.2% false alarms are in-sample checks of the exported artifact, not independent generalization results.
- The real-message report records 94.1% recall and 6.0% false alarms for a separate classifier trained without the 868 validation messages. C was selected partly on that split, so it is tuning evidence. That report does not validate the exported model on unseen data.
- The real-message report uses app fusion, while `training/train.py` prints classifier-only metrics. Its stated reproduction command does not reproduce the report's full app-fusion table.
- The frozen 81-message synthetic smoke report records 97.6% recall and 7.5% false alarms for rules + ML. It is not a Qwen benchmark or a representative real-world benchmark.
- The 20-case Qwen explanation scoring sheet is unfilled. Previous phone observations included the 8-second template timeout; loading a model is not proof of successful Qwen output or acceptable Taglish quality.
- Typecheck, lint and all 127 existing tests passed on the pulled code. These checks include scorer parity against committed samples; they do not prove training provenance or Qwen accuracy. No automated phone testing was performed in this audit.

## Coverage of every `docs/*.md` file

| Document | Applicable requirement / finding |
| --- | --- |
| `OopsScam — Product Requirements Document.md` | Explicit rules + ML verdict and local LLM explanation; requested Qwen classification changes the design. Frozen test size, LLM quality and phone latency acceptance remain incomplete |
| `app-selected-prd-v1.md` | Same hybrid architecture; older model examples need alignment with Qwen3. No custom LLM fine-tuning requirement |
| `BOILERPLATE_PLAN.md` | Earlier shell-only stage. Native modules now require native builds; it is not the current implementation scope |
| `brand-and-visual-guidelines.md` | Requires red/slate palette, no green, and Poppins. Current theme uses blue and green, and no font-family loading/use was found in app/src; conformity is incomplete |
| `AppBuildersPH Hackathon 2026 Participant Briefing.md` | Meaningful local inference, working product, public repo, disclosures, demo video/social post and deadline. Code supports offline processing; event/submission acceptance is not verified |
| `appbuilders-hackathon.md` | Event overview and sponsor information; does not require Qwen training |
| `day-one-build-day-remote.md` | Fresh hackathon work, disclosure, public repo and submission artifacts; artifacts/eligibility need team verification |
| `day-two-demo-day-onsite.md` | On-site team member and demo logistics; cannot be certified from code |
| `faqs-summary.md` | Deadline, recreation instructions, public repo and demo requirements; current README still has team/artifact/phone-timing TODOs |
| `orientation-highlights.md` | Local inference and disclosure obligations; pretrained open-source models and AI coding tools are allowed |
| `tg-conversation-summary.md` | Organizer logistics/context; contains no requirement that Qwen replace ML. Use the participant briefing to resolve older schedule differences |
| `teams-app-project-ideas.md` | Brainstormed alternatives; other products' requirements do not become OopsScam acceptance criteria |

## Remaining product and documentation gaps

- SRS FR-LM-01 and other model-packaging text say the GGUF is outside the APK/repo; the authorized build bundles it and tracks it through Git LFS. Align those requirements with the actual packaging.
- SRS SEC-03 literally prohibits image disk writes. Image ingestion uses temporary private cache files and deletes them after decoding; the requirement needs to explicitly account for that lifecycle or the implementation must change.
- No INTERNET permission is declared in the verified release build. Native dependency telemetry behavior still requires evidence before asserting every SDK contains no telemetry.
- Gallery QR decoding and cancellation acceptance remain for the user's manual tests. Practice mode is deferred P2 scope.
- README disclosures improved in the pull, but icon provenance, official team names, screenshots, phone latency and fresh-clone recreation still need completion/verification.
- AGENTS and older handoffs contain stale implementation status and missing paths (`docs/HANDOFF.md`, `docs/Scam Guardian — Product Requirements Document.md`, `docs/PRD.md`). The current PRD is `docs/OopsScam — Product Requirements Document.md`.
- Implemented Phase 1/2 foundations and most Phase 3 inputs do not establish full acceptance: Qwen's successful on-phone output remains unscored. Current work is Phase 3 validation approaching Phase 4 polish, plus the requested Qwen training/classification change.

Qwen training dependencies are approved and installed in an isolated environment. The source-based data pipeline and CPU throughput measurement are verified, and LoRA training is running. See PLAN.md for current progress. No validated custom GGUF has been produced, and production classification behavior has not changed. Do not describe Qwen classification as complete until the trained artifacts, measured validation and app integration are verified.
