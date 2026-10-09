# OopsScam

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

Filipino users checking suspicious messages, links, screenshots and QR codes, including users who need senior-readable text and familiar controls.

## Product Purpose

Help a user understand warning signs and decide what to do before following a suspicious message. Paste-to-verdict takes at most three deliberate taps; OS selection and first-time permissions are counted separately.

## Positioning

Rules, an exported classifier and a bundled local language model analyze content on the phone, with Taglish explanations and template fallbacks.

## Capabilities and Constraints

React Native/Expo with Android-only routes: Home, Screenshot Review, QR, Result. All processing is local. No remote fonts, telemetry, accounts, history or new dependencies in this UI iteration. Camera and gallery QR decoding, screenshot OCR and text/image sharing reuse the existing native integrations.

Scores are risk scores, not probabilities. Verdicts are Scam, Suspicious and Low risk. Low risk always has a disclaimer and is never described as safe. Only existing domain fusion may change a verdict; AI cannot lower one.

Input is bounded to 2,000 UTF-16 units without splitting surrogate pairs. Partial-input analysis requires acknowledgment. OCR output is editable. Decoded QR content is previewed and confirmed, never opened automatically.

Text, QR payloads and results remain in memory. Image selection may make temporary app-cache copies; owned copies are deleted after processing, with abandoned picker copies retried at startup. Original images are never deleted.

## Brand Commitments

Preserve the scan-bracket logo, Poppins, Red–Slate palette, no green, and simple Taglish. Subtle Persona 5 Royal inspiration applies to graphic framing, confident typography and controlled asymmetry; no copied game assets or compositions.

## Evidence on Hand

Existing bundled fonts/logo assets and fictional message fixtures. Historical OCR/live QR verification is recorded in PLAN.md; current redesign validation is recorded separately in docs/ui-redesign-validation.md. Targets are not benchmarks.

## Accessibility & Inclusion

Body text starts at 16 sp, targets at 48 dp, written verdicts, screen-reader labels, system Back, camera lifecycle, keyboard/safe-area handling and Remove animations. Validate compact phone width and up to 200% font scaling.
