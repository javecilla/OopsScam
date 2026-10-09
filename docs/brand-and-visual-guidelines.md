# OopsScam Brand Identity & Visual Guidelines

This document outlines the official brand identity, color palettes, typography, and logo specs for **OopsScam** (AppBuildersPH Hackathon 2026). Use these exact tokens, codes, and patterns to maintain visual consistency across the mobile app, promo materials, and design assets.

---

## 1. Brand Concept & Philosophy

OopsScam is an on-device, offline-first scam detection and analysis mobile app for Filipinos. 
- **Core Theme:** Urgency, Alertness, Local AI Security, Trust, and Privacy.
- **Key Visual Mood:** Sleek, Modern, Minimalist, High-Contrast, Alert/Security.
- **Logo Choice:** (Selected: Variant 03 - Scan/Alert Box) An exclamation mark inside a modern scan/QR-style bracket system, signifying "OCR Screenshot scan" + "Immediate analysis & alerting".

---

## 2. Brand Colors (Red-Slate Palette)

*Strictly do not use green.* The brand utilizes a Red-Slate warning palette designed for alert systems, where Crimson represents high-risk alerts, Charcoal represents solid privacy/security, and Muted Gold represents medium/suspicious threat levels.

### Primary Colors
Essential for primary UI, brand identity, and dominant elements.

| Color Name | Hex Code | Visual Use Case | Text Color |
| :--- | :--- | :--- | :--- |
| **Vibrant Crimson Red** | `#D21F3C` | Focus, Highlight, Red Flags, "Scam" brand text, high-alert, critical elements. | White |
| **Dark Slate (Charcoal)**| `#2B2F2C` | Backgrounds (Dark mode), major "Oops" brand text, primary dark text in Light mode, headers. | White / Light Red |
| **Rich Black-Slate**    | `#111111` | Absolute dark backgrounds, shadows, high-contrast content cards. | White / Red |

### Secondary & UI Overlay Colors
For borders, overlays, supporting text, and container background card tints.

| Color Name | Hex Code | Visual Use Case | Text Color |
| :--- | :--- | :--- | :--- |
| **Muted Grey**          | `#8E928C` | Captions, borders, inactive tabs, meta-data, sub-labels. | Dark Slate |
| **Ash Gray**            | `#BAC0B9` | Secondary visual elements, borders in light mode. | Dark Slate |
| **Alert Pink/Red Tint** | `#FFEBEB` | Light Mode badge backdrops, highlighted scam phrases, error cards. | Crimson Red |

### Neutral Colors
Used primarily for base backgrounds, high-readability text, and surfaces.

| Color Name | Hex Code | Visual Use Case | Text Color |
| :--- | :--- | :--- | :--- |
| **Pure White**          | `#FFFFFF` | Text in dark mode, cards/containers in light mode, primary light-source. | Dark Slate |
| **Off-White**           | `#F8FAF8` | Light mode background (Base), input background. | Dark Slate |
| **Slate Gray**          | `#5E67E5` | Optional cold-toned UI elements or alternate data states (use sparingly).| White |

### Accent Colors (Threat States)
Crucial for the "Risk Assessment Verdicts" feature.

| Color Name | Hex Code | Threat Verdict | Application |
| :--- | :--- | :--- | :--- |
| **Vibrant Crimson**     | `#D21F3C` | **SCAM** (High Risk) | Top-tier alarms, block alerts, severe warn borders. |
| **Soft Gold (Amber)**   | `#C8B46A` | **SUSPICIOUS** (Med Risk) | Warn states, caution text, scan highlights. |
| **Deep Burgundy**       | `#801A24` | **CRITICAL OVERRIDES**| Deep accent highlights, header warnings. |
| **Alert Coral**         | `#FF453A` | Supporting warnings | Quick notifications, scan alerts. |

---

## 3. Typography (Poppins)

We use the **Poppins** font family (designed by Indian Type Foundry / Google Fonts) to project a modern, bold, accessible yet technical look.

- **Primary Font:** `Poppins` (Sans-Serif)
- **Available Styles:** Thin, Light, Regular, Medium, SemiBold, Bold, ExtraBold, Black (and matching Italics).

### Typographic Scale & Usage:
- **Big Headers / Hero Text:** `Poppins-Bold` or `Poppins-ExtraBold` (e.g., Logo Text, Huge Verdict Label).
- **Sub-headers:** `Poppins-SemiBold` (e.g., Section headers, diagnostic card labels).
- **Body & Paragraph Text:** `Poppins-Regular` (e.g., Diagnostic Rationale, step-by-step guidance).
- **Metadata / Stats / Latency badge:** `Poppins-Medium` or `Poppins-Light` (e.g., "Offline Check: 50ms" in monospace-style Poppins-Medium).

---

## 4. Logo Anatomy & Visual Layout (Selected: Variant #03)

### The Icon Visual:
A minimalist QR/Camera focus bracket in `Vibrant Crimson Red (#D21F3C)` forming a scanning boundary box. Inside is a matching `Vibrant Crimson Red` exclamation mark `!` warning.