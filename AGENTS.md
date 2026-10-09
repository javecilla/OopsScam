# AGENTS.md

Rules for any AI coding tool (Devin, Claude, Copilot, Cursor, ChatGPT) and any teammate working in this repo.

**Project:** OopsScam (repo folder: OopsScam). An Android app, built with React Native and Expo in TypeScript, that checks suspicious texts, links, screenshots and QR codes **entirely on the phone** and explains the result in Taglish.
**Event:** AppBuildersPH Hackathon 2026, theme Local AI. Submission deadline **10:00 AM, Oct 10, 2026** (aim to submit by 9:15 AM). One submission only, no edits.

Read these first, in order: `docs/HANDOFF.md`, `docs/PRD.md`, `PLAN.md`.

## Hard rules

1. **No network calls in the app.** All analysis runs on the device. No cloud APIs, analytics, remote fonts or CDNs. The demo build omits the Android INTERNET permission.
2. **No server.** There is no HTTP API. The app calls TypeScript modules directly.
3. **The LLM cannot lower a verdict.** The verdict comes from rules plus the ML classifier. The LLM only writes the Taglish reason and next steps. It may raise Low risk to Suspicious at 80% confidence or higher. Message text is untrusted data inside prompts.
4. **Never say a message is "safe".** Use "Low risk" or "no red flags found", with a reminder that it is not a guarantee.
5. **Rules, links, scoring and fusion live in one shared pure-TypeScript module** (`src/core`). No React Native imports there, so Node can run it for tests and the evaluation script.
6. **No fake benchmarks.** Report only numbers we measured. Never tune on the frozen test set (`data/test`). Tune on `data/dev`.
7. **No real people's messages** in the repo or test data. Credit every dataset and record its license in `data/sources.md`.
8. **Disclose everything** in the README: models, libraries, datasets, existing code, and which parts were written with AI tools.
9. **Fresh code only.** Nothing from older projects. Anything reused must be disclosed.
10. **Expo Go cannot run our native modules.** Always use a development build.

## Stack (planned; confirm versions on first install)

- Expo (TypeScript, Expo Router), development build, Android only (no iOS).
- LLM: `llama.rn` running `bartowski/Qwen_Qwen3-0.6B-GGUF`, file `Qwen_Qwen3-0.6B-Q4_K_M.gguf` (about 0.5 GB). Upgrade path: Qwen3 1.7B. Qwen3 "thinks" by default; turn that off (as far as we know, `/no_think` in the prompt) and verify.
- OCR and QR: ML Kit through an Expo module, **bundled models only** (`com.google.mlkit:text-recognition`, `com.google.mlkit:barcode-scanning`), not the Google Play Services versions. Check each module's Gradle file and swap the dependency if needed.
- Share target: `expo-share-intent` (or `expo-sharing`) with text and image filters.
- Classifier: trained on a laptop with scikit-learn (character and word TF-IDF, logistic regression), exported to JSON, scored in TypeScript.
- Tests: Jest. Evaluation: a Node script that runs the same `src/core` code.

## Proposed layout (not created yet)

```
app/              Expo Router screens (home, result)
src/core/         rules, links, brands.json, scoring, fusion, templates, types
src/ml/           classifier scoring from the exported weights JSON
src/llm/          llama.rn wrapper, prompt, JSON parsing, timeout
src/vision/       OCR and QR wrappers
assets/           classifier.json (small). The GGUF model is NOT committed.
training/         Python: train and export scripts
data/             train/, dev/, test/ (frozen), sources.md
scripts/          eval script, model push script
docs/             PRD.md, HANDOFF.md
```

## Commands (Windows; all to be confirmed on first run)

```
npm install
npx expo prebuild --platform android
npx expo run:android            # phone connected with USB debugging on
npm test                        # Jest
# evaluation: a Node script in scripts/ that reads data/test and prints precision, recall, false-alarm rate, latency
# model: copy the GGUF onto the phone's app files folder with adb (exact path decided and written in PLAN.md)
```

## Working agreements

- Small commits with clear messages. Run tests before committing.
- Do not add a dependency without adding it to the README "Technology and credits" list.
- Keep the app working at all times: if a feature is not ready, hide it instead of leaving it half-built.
- If the plan and the code disagree, update `PLAN.md` the same day.
