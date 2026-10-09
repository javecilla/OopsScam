# OopsScam

An Android app that checks suspicious texts, links, screenshots and QR codes **on the phone itself**, and explains the result in simple Taglish. No message ever leaves the device, and the demo build has no internet permission.

Built for the AppBuildersPH Hackathon 2026 (theme: Local AI).

> Status: skeleton. Every item marked TODO must be filled in or removed before submission (deadline 10:00 AM, Oct 10, 2026).

## The problem

Araw-araw nakakatanggap tayo ng pekeng GCash o bank alert, SMS phishing, at mga humihingi ng OTP. Marami ang nasscam dahil mukhang totoo ang mga mensaheng ito. A cloud scam checker would need you to upload the very OTP or account details you are trying to protect, and it needs data or signal.

## Why does this product benefit from running AI locally?

Scam messages contain OTPs, account numbers and personal details, so uploading them to a cloud checker defeats the purpose. Running the models on the user's own phone keeps that data private, works when mobile data or signal is unavailable, gives instant verdicts and avoids per-message costs. The only network use is an optional download of updated scam patterns (off by default), and no message ever leaves the device.

## What it does

- Paste or share a message (from SMS, Messenger, Viber and more) and get a verdict: **Scam**, **Suspicious** or **Low risk**, with a 0 to 100 score.
- See the red flags highlighted in the message, a short Taglish reason and what to do next.
- Check a screenshot (on-device OCR) or scan a QR code.
- Never says a message is "safe". It flags risk; it does not guarantee anything.

TODO: add 3 screenshots.

## How it works

Three layers run on the phone. The verdict appears after the first two, and the explanation follows.

1. **Rules** (TypeScript): red-flag patterns in English, Tagalog and Taglish, plus link checks (shorteners, lookalike domains, brand-versus-link mismatches).
2. **ML classifier**: character and word TF-IDF with logistic regression, trained on a laptop and run on the phone from an exported weights file.
3. **Local LLM**: a small quantized model through llama.rn writes the Taglish explanation. It cannot lower a verdict, so a scam message cannot talk its way to "safe". Template explanations are the fallback.

TODO: add the architecture diagram.

## What runs locally and what needs internet

| Function                                                | Runs locally | Needs internet                         |
| ------------------------------------------------------- | ------------ | -------------------------------------- |
| Rules, ML classifier, OCR, QR scanning, LLM explanation | Yes          | No                                     |
| Installing the app and putting model files on the phone | No           | Yes, once, or copy files from a laptop |
| Optional scam-pattern update (off by default)           | No           | Yes; downloads a list, uploads nothing |

## Technology and credits (fill in completely)

**Models**

- TODO: Qwen3 0.6B, `bartowski/Qwen_Qwen3-0.6B-GGUF`, `Qwen_Qwen3-0.6B-Q4_K_M.gguf`. License: TODO (confirm on the model card).

**Frameworks and libraries**

- React Native, Expo, TypeScript, Expo Router
- Prettier, ESLint, eslint-config-expo
- llama.rn 0.12.9 (llama.cpp for React Native), with its Expo config plugin
- expo-file-system (locates the model file in the app's files folder)
- ML Kit text recognition 16.0.1 (bundled Latin model) through the local `modules/oopsscam-vision` Expo module
- expo-camera (bundled ML Kit barcode scanning, camera and gallery QR decoding)
- Android document picker through `modules/oopsscam-vision` (no broad gallery permissions; temporary app-cache copies are deleted after decoding)
- expo-share-intent (Android share menu, text and images)
- expo-clipboard (Paste button; reads the clipboard only when tapped)
- scikit-learn, pandas, NumPy, SciPy, openpyxl (training on a laptop only; not in the app)
- PyTorch, Transformers, PEFT, Safetensors, Hugging Face Hub, psutil and Requests (`training/qwen/requirements.txt`): approved laptop-only Qwen fine-tuning tooling. Training and validation are in progress; these packages are not app dependencies.
- llama.cpp build b11429, commit `d81235049384534c167caea52b85a694f6103d14`: laptop-only GGUF conversion, quantization and offline evaluation tools. Conversion dependencies are declared in `training/qwen/conversion-requirements.txt` and installed separately from training.
- Pillow and qrcode (laptop scripts that generate test images; not in the app)
- Jest with jest-expo (unit tests)
- TODO: anything else added during the build

**Datasets** (full details and licenses in `data/sources.md`)

- PH Spam + Marketing SMS (Scott Lee Chua), CC BY 4.0, credited (used only if downloaded into `data/raw/ph_spam/`; the current `assets/classifier.json` was trained without it)
- UCI SMS Spam Collection (Almeida & Hidalgo), CC BY 4.0, credited
- Team-written Taglish messages (`data/train/team_written.csv`, fictional, AI-assisted)
- TODO: any others, with confirmed licenses

**APIs and cloud services:** none used by the app. TODO: confirm.

**Existing code and assets:** TODO: list anything reused, or write "none".

**AI development tools:** TODO: list the tools used (for example Devin, Claude, others) and what they were used for.

- Claude Code (Anthropic): wrote the rules engine, link checks, scoring and fusion (`src/core`), the classifier scorer (`src/ml`), the LLM wrapper (`src/llm`), the training scripts (`training/`), their unit tests, and the synthetic training messages in `data/train/team_written.csv`.
- Codex (OpenAI): implemented the phase 3 screenshot and QR input screens, the bundled OCR Expo module, image cleanup, and native integration.
- Evaluation and training data: part of the evaluation data (dev, test_v2, adversarial and LLM check sets, scam-pattern examples and brand-domain checks) was generated with an AI tool (Claude Code) and reviewed by the team. Details and counts: `data/sources.md`.

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

## Evaluation

Run (Node 22.15+ or 24, from the repo root; results go to `data/results/`):

```
node --import ./scripts/ts-hooks.mjs scripts/evaluate.ts test_v2
python scripts/check_leakage.py
```

The frozen test set is `data/test_v2/test_v2.csv`: 81 messages (41 scam, 40 legitimate). Its hash is recorded in `data/test_v2.FROZEN.md`; the original `data/test` directory was never created. Results and laptop-only latency measurements are saved in [the evaluation report](data/results/2026-10-09_test_v2.md). This small, AI-written set is a smoke check, not a benchmark.

| Metric                              | Result (measured) |
| ----------------------------------- | ----------------- |
| Scams flagged (recall)              | 97.6%             |
| Legitimate messages wrongly flagged | 7.5%              |
| Verdict time (demo phone)           | TODO              |
| Explanation time (demo phone)       | TODO              |

## Limitations

- Not 100% accurate; it gives a risk level only.
- It cannot prove a sender or payment is real.
- Android restricts SMS and call-audio access, so input is paste, share or screenshot.
- Small local models write weaker Taglish than large cloud models.
- Android only.

## Team

TODO: names exactly as listed on the official AppBuildersPH website.

## License

TODO: choose a license for our code and keep third-party licenses and credits above.
