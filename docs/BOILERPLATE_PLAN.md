# OopsScam Boilerplate Plan

Sources: `SRS.md` (C-2, 4.1), `AGENTS.md`, `docs/app-selected-prd-v1.md`. Goal: a runnable shell only. No product logic.

## 1. Stack decision

| Choice | Reason |
| --- | --- |
| Expo + TypeScript (`create-expo-app`, default template), latest stable | SRS C-2 and AGENTS require React Native with Expo in TypeScript. No exact version is pinned; I cannot verify one offline. |
| Expo Router (file-based routes) | AGENTS names it. Gives navigation with no setup code. |
| Android only | SRS C-2, POR-01. No iOS config. |
| npm | AGENTS commands use `npm`. |
| No native modules yet | Boilerplate runs with `npx expo start --android`. The dev build (AGENTS rule 10) is needed only when `llama.rn`, ML Kit or share-intent are added later. |

## 2. Folder structure

```
app/
  _layout.tsx      Stack navigator
  index.tsx        Home
  result.tsx       Result
src/
  components/      Button.tsx, Text.tsx, Screen.tsx
  theme.ts
  config.ts
.eslintrc.js (or eslint.config.js)   .prettierrc   tsconfig.json
```

Do not create `src/core`, `src/ml`, `src/llm`, `src/vision`, `data/`, `training/` or `scripts/`. They are in the AGENTS layout but are not boilerplate.

## 3. Screens

Navigation: one Stack. Home to Result via a button. Result back via the header back button.

| Route | Title | Content |
| --- | --- | --- |
| `/` Home | "OopsScam" | `// TODO: text box, Paste, sample messages, status strip (SRS 4.1)` plus a button "Go to Result" |
| `/result` Result | "Result" | `// TODO: verdict, score, highlighted message, Taglish reason, next steps (SRS FR-UI-01)` |

Cut from boilerplate:
- Screenshot and QR screens. SRS 4.1 lists them as buttons on Home, and they are P1.
- Practice screen. It is P2.
- Share-target handling. It needs a native module.

## 4. Shared basics

- `src/theme.ts`: export `colors` (`background`, `text`, `primary`, `border`, plus `scam`, `suspicious`, `lowRisk` for later), `spacing` (`xs 4, sm 8, md 16, lg 24`), `fontSize.body = 16`. 16 is the SRS 4.1 minimum.
- `src/components/Text.tsx`: wraps RN `Text` with the theme body size and color.
- `src/components/Button.tsx`: `Pressable` with `title` and `onPress`. Minimum height 48, per SRS 4.1. Sets `accessibilityRole="button"`.
- `src/components/Screen.tsx`: `SafeAreaView` and padding. Wraps each screen's content.
- `src/config.ts`: placeholder constants only, no secrets and no network settings.
  - `APP_NAME = 'OopsScam'`
  - `MAX_INPUT_CHARS = 2000` (SRS FR-IN-01, marked \* there)
  - `LLM_MODEL_FILENAME = 'Qwen_Qwen3-0.6B-Q4_K_M.gguf'`
  - `CLASSIFIER_WEIGHTS_FILE = 'classifier.json'`
- No `.env` file. The app makes no network calls (AGENTS rule 1), so there is nothing to configure per environment.

## 5. Tooling

- TypeScript with `"strict": true`.
- ESLint, using `eslint-config-expo` (Expo's default lint setup, `npx expo lint`).
- Prettier, with `.prettierrc` set to `singleQuote`, `semi`, `printWidth 100`.
- npm scripts: `lint`, `typecheck` (`tsc --noEmit`), `format`.
- Nothing else. No Jest and no husky yet. Jest arrives with `src/core`.

## 6. Build steps (for the builder)

1. Run `create-expo-app` in the repo root with the default (Expo Router) template. Do not overwrite `docs/`, `AGENTS.md` or `README.md`.
   Done when `package.json` and `app/` exist and the old docs are untouched.
2. Remove the template demo content: `app-example`, demo components, hooks, constants and assets that are not needed. Keep the icon and splash assets.
   Done when `app/` holds only `_layout.tsx`, `index.tsx` and `result.tsx`.
3. Set `android` only. Remove the `ios` and `web` entries from `app.json`. Set the name to OopsScam.
   Done when `app.json` has no `ios` or `web` key.
4. Enable TS strict in `tsconfig.json`.
   Done when `"strict": true` is present.
5. Create `src/theme.ts` and `src/config.ts` as in section 4.
   Done when both files typecheck.
6. Create `Text`, `Button` and `Screen` in `src/components/`.
   Done when they typecheck and have no business logic.
7. Write the `_layout.tsx` Stack, the Home screen and the Result screen as in section 3. Use the primitives and the theme only.
   Done when no screen file contains a raw color or number from the theme.
8. Add the Prettier config and npm scripts. Run `npm run format`.
   Done when `npx prettier --check .` exits 0.
9. Run lint and typecheck. Fix the errors.
   Done when `npm run lint` and `npm run typecheck` both exit 0.
10. Run `npx expo start --android` on an emulator or phone. Tap through both screens.
    Done when Home opens, the button opens Result, and Back returns to Home.
11. Add the new dependencies, if any beyond the Expo template, to the README "Technology and credits" list (AGENTS working agreement). Do not touch other README sections.
    Done when the list matches `package.json`.

## 7. Acceptance criteria (all pass or fail)

- [ ] The app starts on Android with no red screen.
- [ ] Home and Result are both reachable, and Back works.
- [ ] `npx tsc --noEmit` exits 0 with `strict` on.
- [ ] `npm run lint` exits 0.
- [ ] `npx prettier --check .` exits 0.
- [ ] `app/` has no screen besides Home and Result.
- [ ] No network call exists in `app/` or `src/`: a grep for `fetch(`, `axios` and `http` finds nothing.

## 8. Out of scope

Auth, backend, real API calls, state libraries, animations, Jest, the dev build and native modules (`llama.rn`, ML Kit, share intent), the rules/ML/LLM code, the data and training folders, Practice mode, the screenshot/QR screens, iOS, i18n, and `PLAN.md` changes.

Flagged as over-engineering for a boilerplate and cut: the `src/core` layering, a typed Result schema (SRS Appendix B), the status strip logic, the INTERNET-permission build variants, and the pattern-update feature (FR-PU).

## 9. Open questions

None block the build.
