# Setup Guide for Teammates

Quick setup instructions to get **OopsScam** running on your local machine.

---

## 1. Prerequisites

- **Node.js**: v20 or newer (v22+ recommended).
- **npm**: Comes with Node.js.
- **Android Environment**:
  - Android Studio installed with Android SDK and build-tools.
  - An Android device (USB debugging enabled) or an Android Virtual Device (AVD emulator).
  - Add Android SDK `platform-tools` to your system `PATH` so `adb` is available.

---

## 2. Installation & Quick Start

1. **Clone and enter the repo:**
   ```bash
   git clone <repo-url>
   cd OopsScam
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run start
   # or directly targeting Android:
   npm run android
   ```

4. **Run on your device:**
   - Press `a` in the Metro terminal to launch on your connected Android device/emulator.

---

## 3. Essential Commands

| Command | Description |
| :--- | :--- |
| `npm run start` | Start the Expo Metro bundler |
| `npm run android` | Start Expo targeting Android |
| `npm run typecheck` | Run TypeScript strict check (`tsc --noEmit`) |
| `npm run lint` | Run ESLint via `expo lint` |
| `npm run format` | Auto-format files with Prettier |

> Always run `npm run typecheck` and `npm run lint` before sharing code.

---

## 4. Key Rules to Remember

1. **Strictly On-Device (No Network Calls):**
   - The app must run 100% offline. Do not add cloud APIs, remote fonts, analytics, or backend endpoints.
2. **Android Only:**
   - We do not support or configure iOS.
3. **Presentation-Only UI Primitives:**
   - Components in `src/components/` (`Button`, `Text`, `Screen`) must contain presentation logic only—no domain logic, state, or context.
4. **Native Modules & Future Dev Builds:**
   - The boilerplate currently runs with standard Expo.
   - When native modules (`llama.rn`, bundled `ML Kit`) are integrated, a native development build will be used:
     ```bash
     npx expo prebuild --platform android
     npx expo run:android
     ```

---

## 5. Helpful References

- [`AGENTS.md`](./AGENTS.md): Standing rules, architectural blueprint, and workflow agreements.
- [`SRS.md`](./SRS.md): Full software requirements, risk scoring formulas, and UI specifications.
- [`docs/OopsScam — Product Requirements Document.md`](./docs/Scam%20Guardian%20—%20Product%20Requirements%20Document.md): Product vision, hackathon criteria, and fallback strategies.
