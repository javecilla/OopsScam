# OopsScam

An Android app that checks suspicious texts and links **on the phone itself**, and explains the result in simple Taglish. All analysis runs on the device: the app makes no network requests, so no message ever leaves the phone.

Built for the AppBuildersPH Hackathon 2026 (theme: Local AI).

> Status at submission: the text and link checker (rules, ML classifier, local LLM explanation, share menu, paste) is built and tested in code. Screenshot (OCR) and QR checking are planned, not built. Items marked TODO are for the team to fill in.

## The problem

Araw-araw nakakatanggap tayo ng pekeng GCash o bank alert, SMS phishing, at mga humihingi ng OTP. Marami ang nasscam dahil mukhang totoo ang mga mensaheng ito. A cloud scam checker would need you to upload the very OTP or account details you are trying to protect, and it needs data or signal.

## Why does this product benefit from running AI locally?

Scam messages contain OTPs, account numbers and personal details, so uploading them to a cloud checker defeats the purpose. Running the models on the user's own phone keeps that data private, works when mobile data or signal is unavailable, gives instant verdicts and avoids per-message costs. The app makes no network requests; every model runs on the phone.

## What it does

- Paste or share a message (from SMS, Messenger, Viber and more) and get a verdict: **Scam**, **Suspicious** or **Low risk**, with a 0 to 100 score.
- See the red flags highlighted in the message, a short Taglish reason and what to do next.
- Never says a message is "safe". It flags risk; it does not guarantee anything.
- Planned (not in this build): check a screenshot with on-device OCR, or scan a QR code.

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

1. **Rules** (TypeScript): red-flag patterns in English, Tagalog and Taglish, plus link checks (shorteners, lookalike domains, brand-versus-link mismatches).
2. **ML classifier**: character and word TF-IDF with logistic regression, trained on a laptop on public Philippine SMS datasets plus our own examples, and run on the phone from an exported weights file.
3. **Local LLM**: Qwen3 0.6B through llama.rn writes the Taglish explanation. It is pretrained and not fine-tuned by us. It cannot lower a verdict, so a scam message cannot talk its way to "safe"; it may only raise Low risk to Suspicious at 80% confidence or more. Template explanations are the fallback.

## What runs locally and what needs internet

| Function                                                | Runs locally | Needs internet                         |
| ------------------------------------------------------- | ------------ | -------------------------------------- |
| Rules, ML classifier, LLM explanation                   | Yes          | No                                     |
| Installing the app and putting model files on the phone | No           | Yes, once, or copy files from a laptop |

The development build still declares Android's default INTERNET permission, which Expo uses to load code from the development server. The app's own code makes no network calls. A demo build without the permission is planned (PLAN.md T16).

## Technology and credits

**Models**

- Qwen3 0.6B by the Qwen team (Alibaba Cloud), Apache 2.0 license (https://huggingface.co/Qwen/Qwen3-0.6B). We use the 4-bit quantized file `Qwen_Qwen3-0.6B-Q4_K_M.gguf` from `bartowski/Qwen_Qwen3-0.6B-GGUF`. Not fine-tuned.
- Our own scam classifier (`assets/classifier.json`), trained by us with `training/train.py` on the datasets below.

**Frameworks and libraries**

- React Native, Expo, TypeScript, Expo Router
- Prettier, ESLint, eslint-config-expo
- llama.rn 0.12.9 (llama.cpp for React Native), with its Expo config plugin
- expo-file-system (locates the model file in the app's files folder)
- expo-share-intent (Android share menu, text)
- expo-clipboard (Paste button; reads the clipboard only when tapped)
- scikit-learn, pandas, NumPy, SciPy, openpyxl (training on a laptop only; not in the app)
- Pillow and qrcode (laptop scripts that generate test images; not in the app)
- Jest with jest-expo (unit tests)

**Datasets** (full details, licenses and counts in `data/sources.md`)

- PH Spam + Marketing SMS (Scott Lee Chua, Kaggle), CC BY 4.0, credited
- Tagalog-SMS (onzero0, Kaggle), CC0 public domain
- SMS Phishing Dataset for Machine Learning and Pattern Recognition (Mishra & Soni, Mendeley Data), CC BY 4.0, credited
- UCI SMS Spam Collection (Almeida & Hidalgo), CC BY 4.0, credited (used in early training only)
- Our own fictional messages for training and evaluation (`data/train`, `data/dev`, `data/test_v2`, `data/adversarial`, `data/llm_eval`), written with an AI tool

The three public datasets above contain real messages published by their authors. They are included unmodified in `data/raw/` under their own licenses (credits in `data/raw/README.md`), so anyone can retrain the classifier from a fresh clone with `python training/train.py`. Personal names are replaced with NAME in memory before training. They are not covered by this repo's MIT license.

**APIs and cloud services:** none. The app makes no network requests and uses no cloud AI API. Web search was used during development only, to research scam advisories and check brand domains (`data/patterns/ph_scam_patterns.md`, `data/TODO-verify-domains.md`).

**Existing code and assets:**

- No code from earlier projects. The app started from the Expo project template (`create-expo-app`) on Oct 9, 2026.
- Open-source libraries and the Qwen3 model listed above.
- Fonts in `assets/fonts`: DM Sans and Poppins, both under the SIL Open Font License 1.1 (license files included).
- TODO: confirm the source of the app icon, splash and favicon images in `assets/images` and `assets/favicons` (Expo template defaults or made by the team).

**AI development tools:**

- Claude Code (Anthropic): wrote the rules engine, link checks, scoring and fusion (`src/core`), the classifier scorer (`src/ml`), the LLM wrapper (`src/llm`), the Home and Result screens and app wiring, the training, evaluation and data scripts (`training/`, `scripts/`), their unit tests, and the data documentation.
- Evaluation and training data: all of our own messages (training examples, dev, test_v2, adversarial and LLM check sets, scam-pattern examples) were generated with Claude Code. TODO: team review of this data before submission.
- TODO: add any other AI tools the team used (for example Devin) and what they were used for.

## Build and install

Requirements: Node.js, Java, Android Studio with the Android SDK and NDK, a phone with USB debugging on. Expo Go does **not** work; this app needs a development build.

```
npm install
npx expo prebuild --platform android
npx expo run:android
```

Copy the model onto the phone (debug/development build installed first; the app reads `/data/data/com.oopsscam.app/files/Qwen_Qwen3-0.6B-Q4_K_M.gguf`):

```
bash scripts/push-model.sh models/Qwen_Qwen3-0.6B-Q4_K_M.gguf
```

Without the model file the app still works and shows template explanations ("Templates only" in the status strip).

TODO: confirm these commands on a clean machine; add the release APK build steps and download link.

## Evaluation

Run (Node 22.15+ or 24, from the repo root; results go to `data/results/`):

```
node --import ./scripts/ts-hooks.mjs scripts/evaluate.ts
python scripts/check_leakage.py
```

All numbers below were measured with the app's own analysis code (rules + classifier) on Oct 10, 2026. "Flagged" means a verdict of Suspicious or Scam.

| Test set | Messages | Scams flagged (recall) | Legitimate messages wrongly flagged |
| --- | --- | --- | --- |
| `data/test_v2`: held out and frozen (SHA-256 in `data/test_v2.FROZEN.md`), AI-written | 81 (41 scam, 40 legit) | 97.6% | 7.5% |
| Real Philippine SMS: 20% of the public datasets, scored by a model trained without them (the shipped model was then retrained on all data) | 868 (255 scam, 613 legit) | 94.1% | 6.0% |
| Prompt-injection scams (`data/adversarial`) | 12 scam | 91.7% | n/a |

Limits of these numbers: the sets are small. test_v2 was written by an AI tool, not by real scammers. The real held-out messages come from the same inboxes as the training data, so that result is somewhat optimistic. Details: `data/results/2026-10-10_test_v2.md`, `data/results/2026-10-10_real_ph_heldout.md`.

| Speed | Result (measured) |
| --- | --- |
| Rules + classifier, per message, on a laptop | under 2 ms (median about 0.3 ms) |
| Verdict time on the demo phone | TODO: measure |
| Explanation time on the demo phone | TODO: measure |

## Limitations

- Not 100% accurate; it gives a risk level only.
- It cannot prove a sender or payment is real.
- Android restricts SMS and call-audio access, so input is paste or share.
- Small local models write weaker Taglish than large cloud models.
- Android only.

## Team

TODO: confirm names exactly as listed on the official AppBuildersPH website: Jerome Avecilla, Gwyn Barte, Johnrey Gabon, Raizel Sablan.

## License

Our code is released under the MIT License (see `LICENSE`). Third-party models, libraries, fonts and datasets keep their own licenses, listed above.
