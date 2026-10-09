# OopsScam

An Android app that checks suspicious texts, emails, links, screenshots and QR codes **on the phone itself**, and explains the result in simple Taglish. All analysis runs on the device, and the release APK has no internet permission, so no message ever leaves the phone.

Built for the AppBuildersPH Hackathon 2026 (theme: Local AI).

> Status at submission: built — text and link checking (rules, ML classifier, local LLM explanation), email checking (email classifier and sender-address check), share menu, paste, screenshot checking (on-device OCR) and QR checking. The release APK bundles the model and has no internet permission. Items marked TODO are for the team to fill in.

## The problem

Araw-araw nakakatanggap tayo ng pekeng GCash o bank alert, SMS phishing, at mga humihingi ng OTP. Marami ang nasscam dahil mukhang totoo ang mga mensaheng ito. A cloud scam checker would need you to upload the very OTP or account details you are trying to protect, and it needs data or signal.

## Why does this product benefit from running AI locally?

Scam messages contain OTPs, account numbers and personal details, so uploading them to a cloud checker defeats the purpose. Running the models on the user's own phone keeps that data private, works when mobile data or signal is unavailable, gives instant verdicts and avoids per-message costs. The app makes no network requests; every model runs on the phone.

## What it does

- Paste or share a message (from SMS, Messenger, Viber and more) and get a verdict: **Scam**, **Suspicious** or **Low risk**, with a 0 to 100 score.
- See the red flags highlighted in the message, a short Taglish reason and what to do next.
- Never says a message is "safe". It flags risk; it does not guarantee anything.
- Check a screenshot (on-device OCR turns it into editable text) or scan a QR code; both go through the same checks. A QR Ph payment code (GCash, Maya, banks) is not given a verdict; the app shows who receives the money and the amount, and reminds you to check the receiver before paying.
- Optional SMS auto-check (stretch, **off by default**): when you turn on "Auto-check new texts", each new incoming text is checked in the background with the rules and classifier only (no LLM). A notification appears only for Suspicious or Scam, and the lock screen shows only "OopsScam: possible scam text". Tapping it opens the full result with the Taglish explanation. Texts are checked in memory and never stored; the inbox is never read.
- Paste an email, with or without its From and Subject lines: it is scored by a separate email classifier, and a sender address that imitates a brand (for example `alerts@bdo-secure-login.example`) is flagged.

TODO: add 3 screenshots.

## How it works

Three layers run on the phone. The verdict appears after the first two, and the explanation follows.

```
message ──> 1. Rules (red flags, link checks) ──┐
        └─> 2. ML classifier (scam probability) ─┴─> fusion ──> verdict + score (under 1 s)
                                                                    │
                                     3. Local LLM (Qwen3 0.6B) ─────┴─> Taglish reason + next steps
                                        (template text if the model is missing, slow or wrong)
```

1. **Rules** (TypeScript): red-flag patterns in English, Tagalog and Taglish, plus link checks (shorteners, lookalike domains, brand-versus-link mismatches) and, for emails, a lookalike check on the From, Reply-To and Sender addresses.
2. **ML classifier**: character and word TF-IDF with logistic regression, trained on a laptop on public Philippine SMS datasets plus our own examples, and run on the phone from an exported weights file. Input that looks like an email (header lines, or a greeting and a sign-off) is scored by a second classifier of the same kind, trained on an LLM-generated email dataset plus the SMS data and our own fictional Philippine emails.
3. **Local LLM**: Qwen3 0.6B through llama.rn writes the Taglish explanation. It is pretrained and not fine-tuned by us. It cannot lower a verdict, so a scam message cannot talk its way to "safe"; it may only raise Low risk to Suspicious at 80% confidence or more. Template explanations are the fallback.

## What runs locally and what needs internet

| Function                                                | Runs locally | Needs internet                         |
| ------------------------------------------------------- | ------------ | -------------------------------------- |
| Rules, ML classifiers (SMS and email), OCR, QR scanning, LLM explanation | Yes          | No                                     |
| Installing the app (the model is inside the APK)        | No           | Yes, once, or copy the APK from a laptop |

The release APK declares no INTERNET or ACCESS_NETWORK_STATE permission (`blockedPermissions` in `app.json`), so Android itself blocks network access; judges can confirm this in the app info screen. Only debug builds talk to the Metro development server on the laptop.

The optional SMS auto-check (`modules/sms-watch`) adds only `RECEIVE_SMS` (new incoming texts), `POST_NOTIFICATIONS` (Android 13 and later) and `WAKE_LOCK` (keeps the phone awake for the second the background check runs). `RECEIVE_SMS` and `POST_NOTIFICATIONS` are asked for at runtime, only after you turn the setting on and read a short Taglish explanation. The app never asks for `READ_SMS`, never reads the inbox, and cannot send, delete or block texts. Even with the setting on, nothing can be sent anywhere, because the app has no internet permission. Turn the setting off and checks stop immediately.

## Technology and credits

**Models**

- Qwen3 0.6B by the Qwen team (Alibaba Cloud), Apache 2.0 license (https://huggingface.co/Qwen/Qwen3-0.6B). We use the 4-bit quantized file `Qwen_Qwen3-0.6B-Q4_K_M.gguf` from `bartowski/Qwen_Qwen3-0.6B-GGUF`. Not fine-tuned.
- Our own scam classifier (`assets/classifier.json`), trained by us with `training/train.py` on the datasets below.
- Our own email classifier (`assets/classifier_email.json`), trained by us with `training/train_email.py`. It is shared under CC BY-SA 4.0 because it is trained on a CC BY-SA 4.0 dataset (see License).

**Frameworks and libraries**

- React Native, Expo, TypeScript, Expo Router
- Prettier, ESLint, eslint-config-expo
- llama.rn 0.12.9 (llama.cpp for React Native), with its Expo config plugin
- expo-file-system (locates the model file in the app's files folder)
- ML Kit text recognition 16.0.1 (bundled Latin model) through the local `modules/oopsscam-vision` Expo module
- expo-camera (bundled ML Kit barcode scanning, camera and gallery QR decoding)
- Android document picker through `modules/oopsscam-vision` (no broad gallery permissions; temporary app-cache copies are deleted after decoding)
- expo-share-intent (Android share menu, text and images)
- Local `modules/sms-watch` Expo module for the optional SMS auto-check: an Android SMS receiver, a React Native Headless JS task and native AndroidX notifications (no expo-notifications or Firebase; no new npm dependencies)
- expo-clipboard (Paste button; reads the clipboard only when tapped)
- expo-sqlite (on-device SQLite database for local scan history)
- scikit-learn, pandas, NumPy, SciPy, openpyxl (training on a laptop only; not in the app)
- PyTorch, Transformers, PEFT, Safetensors, Hugging Face Hub, psutil and Requests (`training/qwen/requirements.txt`): approved laptop-only Qwen fine-tuning tooling. Training and validation are in progress; these packages are not app dependencies.
- llama.cpp build b11429, commit `d81235049384534c167caea52b85a694f6103d14`: laptop-only GGUF conversion, quantization and offline evaluation tools. Conversion dependencies are declared in `training/qwen/conversion-requirements.txt` and installed separately from training.
- Pillow and qrcode (laptop scripts that generate test images; not in the app)
- Jest with jest-expo (unit tests)

**Datasets** (full details, licenses and counts in `data/sources.md`)

- PH Spam + Marketing SMS (Scott Lee Chua, Kaggle), CC BY 4.0, credited
- Tagalog-SMS (onzero0, Kaggle), CC0 public domain
- SMS Phishing Dataset for Machine Learning and Pattern Recognition (Mishra & Soni, Mendeley Data), CC BY 4.0, credited
- UCI SMS Spam Collection (Almeida & Hidalgo), CC BY 4.0, credited (used in early training only)
- Phishing and Legitimate Emails Dataset for ML 2026 (Kuladeep P, Kaggle), CC BY-SA 4.0, credited: 10,000 English emails generated by an LLM (not real messages), used only for the email classifier. Its layout gives the labels away (only legit rows have a Subject line, only phishing rows a Keywords line), so subject lines, keyword lines and sign-offs are stripped in memory before training, which leaves 2,636 unique emails.
- Our own fictional messages for training and evaluation (`data/train`, `data/dev`, `data/test_v2`, `data/adversarial`, `data/llm_eval`, `data/train_email`, `data/email_test`), written with AI tools

The three public SMS datasets above contain real messages published by their authors. They and the email dataset are included unmodified in `data/raw/` under their own licenses (credits in `data/raw/README.md`), so anyone can retrain the classifiers from a fresh clone with `python training/train.py` and `python training/train_email.py`. Personal names are replaced with NAME in memory before training. They are not covered by this repo's MIT license.

**APIs and cloud services:** none. The app makes no network requests and uses no cloud AI API. Web search was used during development only, to research scam advisories and check brand domains (`data/patterns/ph_scam_patterns.md`, `data/TODO-verify-domains.md`).

**Existing code and assets:**

- No code from earlier projects. The app started from the Expo project template (`create-expo-app`) on Oct 9, 2026.
- Open-source libraries and the Qwen3 model listed above.
- Fonts in `assets/fonts`: DM Sans and Poppins, both under the SIL Open Font License 1.1 (license files included).
- TODO: confirm the source of the app icon, splash and favicon images in `assets/images` and `assets/favicons` (Expo template defaults or made by the team).

**AI development tools:**

- Claude Code (Anthropic): wrote the rules engine, link checks, scoring and fusion (`src/core`), the classifier scorer (`src/ml`), the LLM wrapper (`src/llm`), the Home and Result screens and app wiring, the training, evaluation and data scripts (`training/`, `scripts/`), their unit tests, and the data documentation.
- Codex (OpenAI): implemented the phase 3 screenshot and QR input screens, the bundled OCR Expo module, image cleanup, and native integration.
- Claude Code (Anthropic): wrote the optional SMS auto-check (`modules/sms-watch`, `src/sms`, the Home screen toggle and its unit test).
- Devin (Cognition): email checking: email detection and the sender-address check (`src/core/email.ts`, the `sender_lookalike` rule), the email classifier training script (`training/train_email.py`), the email-model wiring in `src/pipeline.ts`, `scripts/evaluate.ts` and the Home and Result screens, their unit tests, and the training-data analysis behind them.
- Evaluation and training data: all of our own messages (training examples, dev, test_v2, adversarial and LLM check sets, scam-pattern examples) were generated with Claude Code, except the email sets (`data/train_email`, `data/email_test`), which were written by Devin. TODO: team review of this data before submission.

## Build and install

Requirements: Node.js, Java, Android Studio with the Android SDK and NDK, a phone with USB debugging on. Expo Go does **not** work; this app needs a development build.

```
git lfs pull
npm install
npx expo prebuild --platform android
npx expo run:android
```

The Android prebuild hook packages `models/Qwen_Qwen3-0.6B-Q4_K_M.gguf` in the APK. It rejects Git LFS pointer files; run `git lfs pull` before prebuild. The app copies the bundled model to its private files folder on first launch. Screenshots and QR images use bundled ML Kit models and do not download models at runtime.

Without the model file the app still works and shows template explanations ("Templates only" in the status strip).

The Windows SDK/Java setup and standalone release-build command are in [the build handoff](handoff/oopsscam-handoff-2026-10-10-build.md). `app.json` blocks INTERNET, ACCESS_NETWORK_STATE and RECORD_AUDIO on every prebuild. Debug builds need Metro; use `android/app/build/outputs/apk/release/app-release.apk` for offline testing and distribution. Fresh-clone verification remains pending.

**SMS auto-check install note:** install the APK over USB (`npx expo run:android` or `adb install`). Google Play Protect can block an APK that requests `RECEIVE_SMS` when it is installed from a browser, file manager or messaging app. If Android greys out the SMS permission, open App info and look for "Allow restricted settings".

**SMS auto-check demo note:** turn Wi-Fi and mobile data off but keep cellular on. Airplane mode also blocks SMS, so no texts arrive.

TODO: confirm the build on a clean machine and add the release APK download link.

## Evaluation

Run (Node 22.15+ or 24, from the repo root; results go to `data/results/`):

```
node --import ./scripts/ts-hooks.mjs scripts/evaluate.ts test_v2
node --import ./scripts/ts-hooks.mjs scripts/evaluate.ts email_test
python scripts/check_leakage.py
```

All numbers below were measured with the app's own analysis code (rules + classifier) on Oct 10, 2026. "Flagged" means a verdict of Suspicious or Scam.

| Test set | Messages | Scams flagged (recall) | Legitimate messages wrongly flagged |
| --- | --- | --- | --- |
| `data/test_v2`: held out and frozen (SHA-256 in `data/test_v2.FROZEN.md`), AI-written | 81 (41 scam, 40 legit) | 97.6% | 7.5% |
| Real Philippine SMS: 20% of the public datasets, scored by a model trained without them (the shipped model was then retrained on all data) | 868 (255 scam, 613 legit) | 94.1% | 6.0% |
| Prompt-injection scams (`data/adversarial`) | 12 scam | 91.7% | n/a |
| Emails (`data/email_test`): held out and frozen (SHA-256 in `data/email_test.FROZEN.md`), AI-written | 40 (20 scam, 20 legit) | 95.0% | 15.0% (3 of 20, all Suspicious, none Scam) |

Limits of these numbers: the sets are small. test_v2 and the email set were written by AI tools, not by real scammers. The real held-out messages come from the same inboxes as the training data, so that result is somewhat optimistic. The email classifier learned mostly from LLM-generated emails, and its 15.0% false alarms are above our 10% target. For reference only (nothing was tuned on this set): scoring the same 40 emails with the SMS classifier also catches 95.0% but wrongly flags 35.0%, and rules alone catch 85.0% and wrongly flag 5.0%. Details: `data/results/2026-10-10_test_v2.md`, `data/results/2026-10-10_real_ph_heldout.md`, `data/results/2026-10-10_email_test.md`.

| Speed | Result (measured) |
| --- | --- |
| Rules + classifier, per message, on a laptop | under 2 ms (median about 0.3 ms) |
| Rules + email classifier, per email, on a laptop | under 10 ms (median about 1.2 ms) |
| Verdict time on the demo phone | TODO: measure |
| Explanation time on the demo phone | TODO: measure |

## Limitations

- Not 100% accurate; it gives a risk level only.
- It cannot prove a sender or payment is real. Email headers can be forged, so an official-looking From address proves nothing; the app only checks the pasted text.
- Android restricts SMS and call-audio access, so input is paste, share, a screenshot or a QR code. The optional SMS auto-check sees only new incoming texts (RECEIVE_SMS), never the inbox.
- Small local models write weaker Taglish than large cloud models.
- Android only.

## Team

TODO: confirm names exactly as listed on the official AppBuildersPH website: Jerome Avecilla, Gwyn Barte, Johnrey Gabon, Raizel Sablan.

## License

Our code is released under the MIT License (see `LICENSE`). Third-party models, libraries, fonts and datasets keep their own licenses, listed above. The email classifier weights (`assets/classifier_email.json`) are trained on a CC BY-SA 4.0 dataset and are shared under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/), not MIT.
