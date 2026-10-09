# OopsScam

**On-device scam detection for Filipino users — 100% offline, zero data leaks.**

---

## Overview

OopsScam is an on-device scam detection and analysis mobile app tailored for Filipino users. Users can paste raw text or links, or upload screenshots and QR codes. The system evaluates the input and provides a risk level, identified red flags, and an actionable explanation without requiring an internet connection or transmitting data outside the device.

---

## Team

**TERMINAL LARPERS** — AppBuildersPH Hackathon 2026

| Member | Branch |
|---|---|
| Jerome Avecilla | `jerome` |
| Gwyn Barte | `gwyn` |
| Johnrey Gabon | `johnrey` |
| Raizel Sablan | `raizel` |

---

## Branch Structure

| Branch | Purpose |
|---|---|
| `main` | Stable, submission-ready code. Protected — no direct pushes. |
| `jerome` | Jerome's working branch |
| `gwyn` | Gwyn's working branch |
| `johnrey` | Johnrey's working branch |
| `raizel` | Raizel's working branch |

Each member works on their own branch and opens a pull request into `main`. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

---

## The Problem

Every day, Filipinos receive fake GCash alerts, bank warnings, telco smishing, and OTP scams. Many fall victim because these messages look convincingly real.

Existing scam checkers have a core contradiction — they ask you to upload the very message, OTP, or screenshot you're trying to protect, to a cloud server. On top of that, they're useless when you have no signal or mobile data load, which is exactly when scam SMS tends to arrive.

---

## The Solution

OopsScam analyzes suspicious messages, links, screenshots, and QR codes **entirely on your phone** — no internet needed, nothing leaves the device.

Paste or share a message. The app immediately tells you:

- **Verdict** — Scam, Suspicious, or Low Risk
- **Risk Score** — 0 to 100
- **Red Flags** — highlighted directly in the message
- **Explanation** — plain-language summary of why it's dangerous and what to do next

---

## Goal

Create a local scam checker that is 100% on-device: it reads texts, links, screenshots, and QR codes, works fully offline, and keeps every message private. No sign-up, no account, no data ever leaves your phone.

---

## Who It's For

- **Seniors and non-tech users** — clear, simple guidance without complicated setup
- **Online sellers** — quickly verify payment screenshots without uploading customer data to public servers
- **Daily GCash and mobile banking users** — protection against fake links and QR phishing even without a data connection

---

## Why Local AI?

Running the analysis on-device solves both problems cloud checkers can't:

1. **Privacy** — your OTPs, account numbers, and screenshots never touch an external server
2. **Offline** — scam SMS arrives even with no signal or load; the app works in Airplane Mode

---

## Impact

OopsScam gives ordinary Filipinos — especially seniors and those with limited digital literacy — a fast, private, and always-available way to check before they click, share, or respond. No internet dependency, no recurring cost, no data risk.

---
