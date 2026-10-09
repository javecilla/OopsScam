# HANDOFF.md: project context for anyone (or any AI) continuing this work

Written Oct 9, 2026, at the end of the planning phase. The full design is in `docs/PRD.md`. The task list is in `PLAN.md`. Repo rules are in `AGENTS.md`.

## One paragraph

OopsScam is an Android app (React Native with Expo, TypeScript) that checks suspicious texts, links, screenshots and QR codes entirely on the phone and explains the verdict in Taglish. It targets seniors, online sellers and e-wallet users. It is our entry for the AppBuildersPH Hackathon 2026, theme **Local AI**: "build an AI product that remains genuinely useful when the cloud disappears."

## Status (Updated 2026-10-10, ~06:00 PHT)

- Implementation complete: Offline ML classifier, rules engine, Qwen LLM explanation pipeline, bundled ML Kit OCR/QR, privacy-safe SQLite scan history, and P5R-inspired Neo-Brutalist UI overhaul.
- **Latest Continuation Handoff:** [`handoff/oopsscam-handoff-2026-10-10-ui-merge.md`](handoff/oopsscam-handoff-2026-10-10-ui-merge.md).
- Verification: 15/15 Jest suites pass (214 tests), `tsc` typecheck clean, `expo lint` clean, model recall 97.6% on test_v2.
- Ready for commit and push on branch `raizel`.

## Event facts (from the participant briefing)

- Build Day is remote: Oct 9, building from 2:30 PM. **Submission deadline 10:00 AM, Oct 10. No extensions, one submission, no edits.** Code freezes at the deadline.
- Submit on the Cerebral Valley event page: `cerebralvalley.ai/e/appbuildersph-hackathon-2026`. Official site: `appbuildersph.com/hackathon`. Questions go in the official Telegram group.
- Teams of 1 to 4. Only participants listed on the official website can compete. **Outside help is a disqualification reason.** Results can be disputed for a pre-existing project, outside help or fake benchmarks.
- Required: substantially built during the hackathon; a meaningful part of AI inference runs locally; a working product; a public GitHub repo by the deadline; a demo video of about 1 minute; an X or LinkedIn post of the video tagging Devin / Cognition with #AppBuildersPH.
- The submission must disclose: models, technologies and frameworks, APIs and cloud services, existing code and assets, AI development tools. It must state what runs locally and what needs internet, and answer: **"Why does this product benefit from running AI locally?"**
- Judging: Problem & Usefulness 25%, Local AI Implementation 25%, Technical Execution 20%, Innovation 15%, Product & Demo Quality 15%.
- Demo Day, Oct 10, Cyberzone, SM Makati: registration 12:00 PM, AV checks 12:15 PM, finalists announced about 1:00 PM, pitching from about 1:40 PM. Pitch is 5 minutes plus 3 minutes of judge Q&A. Finalists must have someone on site with a laptop. Wi-Fi, power, HDMI and USB-C are provided.
- Mobile apps are allowed. Special awards exist (AMD, Cognition/Devin, WhiteCloak, Tutorials Dojo, People's Choice). The WhiteCloak criteria are not known; ask the organizers.

## Decisions made, and why

| Decision                                                                  | Why                                                                                                                                     |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Build a scam checker (not the other ideas we explored)                    | Real problem, simple demo, clear "why local" story, achievable in about 19.5 hours                                                      |
| Android app with React Native and Expo (no iOS)                           | The team chose Expo; Android sideloading is easy; the phone makes the airplane-mode demo convincing                                     |
| Development build, not Expo Go                                            | llama.rn, ML Kit and share-intent are native modules Expo Go cannot run                                                                 |
| Three layers: rules, ML classifier, local LLM                             | Verdict in about a second from the first two; the LLM only adds the explanation, so a slow model cannot break the demo                  |
| LLM cannot lower a verdict                                                | Prompt-injection safety: a scam text cannot talk the checker into calling it safe                                                       |
| Rules and fusion in one shared TypeScript module                          | The Node evaluation script and the app run identical code, so reported numbers match the app                                            |
| LLM: Qwen3 0.6B Q4_K_M (about 0.5 GB), upgrade to 1.7B if Taglish is weak | Proposed by a teammate; small enough for any phone; must be tested for Taglish quality and JSON compliance                              |
| OCR and QR use the **bundled** ML Kit models                              | Adds about 4 MB (OCR) plus 2.4 MB (QR) per CPU architecture, and works offline from the first run with no Google Play Services download |
| Demo build without the Android INTERNET permission                        | A verifiable offline proof judges can see in app info                                                                                   |
| Call mode is **out of scope for now**                                     | Too risky for the time; revisit only after the core flow works. Practice mode is the stretch feature                                    |
| Verdict labels: Scam, Suspicious, Low risk                                | Never "safe"; the app flags risk and guarantees nothing                                                                                 |
| Optional SMS auto-check (T18): **Headless JS shipped in code**, with a neutral-notification fallback | RECEIVE_SMS only, off by default; background check is rules + classifier (no LLM); native Kotlin notifications (no expo-notifications/Firebase, so still no INTERNET). If the service cannot start, the receiver posts "May bagong text" and the app analyzes on open. Not yet verified on the phone; revert its single commit if AT-17 to AT-21 fail by 5:00 AM |

## The scoring design (summary; the PRD has the full table)

Each red flag adds points (total capped at 100): asking you to send an OTP, MPIN, password or ID 60; lookalike domain of a known brand 45; link to an .apk 35; remote-access request 30; brand named but link not official 30; fee request 25; account threat, prize and emergency-relative story 20 each; urgency, shortener, odd domain ending and secrecy 15 each; unknown link 8. Combination bonuses apply. A real-OTP rule (4 to 8 digit code, "do not share" wording, no link) subtracts 60. Thresholds: 60 or more Scam, 30 to 59 Suspicious, below 30 Low risk. When the classifier exists: score = 0.6 x rules + 0.4 x (100 x probability), with four hard flags (credential request, lookalike domain, APK, remote access) keeping the rules score as a floor. These weights are starting values to tune on a dev set.

## Things not verified yet (do not assume)

- Which Expo OCR and QR module bundles its ML Kit models, or can have its dependency swapped.
- Whether Qwen3 0.6B writes usable Taglish and valid JSON, and its license (believed to be Apache 2.0; confirm on the model card).
- The official domains in the brand list (GCash, BDO, BPI, LTO, DSWD and others) must be checked against official sources.
- Dataset licenses: confirmed CC BY 4.0 for PH Spam + Marketing SMS (Kaggle) and the UCI SMS Spam Collection. **Not confirmed:** Mishra and Soni (Mendeley), Smishtank, and the two other Kaggle Philippine sets. Do not use: TrainingDataPro sample (CC BY-NC-ND).
- The statistics in the PRD (the 41% smishing share from a Q4 2024 survey, and the over ₱12 billion CICC loss figure) came from search snippets and a secondary source; verify them before putting any on a slide.
- Competitor features (Google Messages scam detection, Whoscall) change; recheck before the pitch.
- Commands in `AGENTS.md` and the README have not been run.

## Biggest risks

1. Expo build or native-module problems (Android Studio, NDK, llama.rn, ML Kit). Start the build first.
2. The LLM is too slow or too weak for the phone: use templates.
3. False alarms on genuine OTP and bank messages: keep hard negatives in the test set.
4. Time: feature freeze at 3:00 AM, submit by 9:15 AM.
5. Overclaiming: say the app flags risk; state the limits of the small test set.

## Useful sources

- llama.rn: `github.com/mybigday/llama.rn`
- An Expo on-device LLM example: `github.com/Rapitzo/OfflineOS`
- expo-share-intent: `npmjs.com/package/expo-share-intent`
- react-native-vision-camera-mlkit: `github.com/pedrol2b/react-native-vision-camera-mlkit`
- An offline Expo app using ML Kit OCR: `github.com/Luna-Davis/digital-id`
- Model: `huggingface.co/bartowski/Qwen_Qwen3-0.6B-GGUF`
- Datasets: PH Spam + Marketing SMS on Kaggle (`scottleechua`), UCI SMS Spam Collection (`archive.ics.uci.edu/dataset/228`)

## Prompt to give a new AI assistant

> I am building "OopsScamOopsScam" for the AppBuildersPH Hackathon 2026 (Local AI theme), an Android app using React Native with Expo and TypeScript that checks scam texts, links, screenshots and QR codes fully on-device. Read AGENTS.md, docs/HANDOFF.md, docs/PRD.md and PLAN.md in the repo first. No code exists yet. Help me complete Phase 1 of PLAN.md. Follow the hard rules in AGENTS.md (no network calls, no server, the LLM cannot lower a verdict, never say "safe", no fake benchmarks). The submission deadline is 10:00 AM on Oct 10, 2026. Tell me clearly what you have verified and what you have not.
