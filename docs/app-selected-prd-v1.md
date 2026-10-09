# **Product Requirements Document**

**App Name:** OopsScam  
**Event:** AppBuildersPH Hackathon 2026 (Theme: Local AI)  
**Platform:** Android app (React Native / Expo Development Build)  
**Submission Deadline:** October 10, 2026, 10:00 AM

## **Overview**

OpsScam is an on-device scam detection and analysis mobile app tailored for Filipino users. Users can paste raw text or links, or upload screenshots and QR codes. The system evaluates the input and provides a risk level, identified red flags, and an actionable explanation in Taglish without requiring an internet connection or transmitting data outside the device.

| Judging Criterion           | Weight | Focus Area                       | OpsScam Implementation                                                                                                                                        |
| :-------------------------- | :----- | :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Problem & Usefulness**    | 25%    | Real-world pain point            | Mitigates financial loss from fake GCash, bank alerts, and OTP harvesting while keeping user data private.                                                    |
| **Local AI Implementation** | 25%    | Meaningful on-device computation | Combines local heuristic rules, an on-device ML classifier, offline OCR/QR parsing, and a local quantized SLM.                                                |
| **Technical Execution**     | 20%    | Stability and speed              | Multi-layer analysis architecture featuring a deterministic rule-based fallback to avoid latency bottlenecks.                                                 |
| **Innovation**              | 15%    | Unique value proposition         | Context-aware Taglish explanations, Philippine bank and e-wallet domain validation, and architectural safeguards where the LLM cannot lower a threat verdict. |
| **Product & Demo Quality**  | 15%    | UX and live presentation         | Direct two-screen workflow, verification in airplane mode, and reproducible evaluation test scripts.                                                          |

## **1\. Problem & Usefulness (25%)**

### **Problem Statement**

Araw-araw, target ang mga Pilipino ng fake GCash notifications, banking alerts, telco smishing, at mapanlinlang na OTP requests. Nagdudulot ito ng milyun-milyong pisong financial loss. Ang malaking balakid sa umiiral na cloud-based checkers:

> 1. **Privacy Contradiction:** Hinihingi ng cloud checkers na i-upload ng biktima ang mismong OTP, account details, o screenshot na sinusubukan nilang protektahan.
> 2. **Connectivity Barrier:** Dumadating ang SMS scams kahit walang mobile data load o mahina ang cell signal, dahilan para maging inutil ang cloud-only security tools.

### **Target Users**

- **Seniors / Non-Tech Savvy Users:** Madalas makatanggap ng raffle alerts, fake ayuda, at pananakot na "blocked account". Kailangan nila ng malinaw na Taglish guidance nang walang kumplikadong sign-up.
- **Online Sellers (Marketplace / E-commerce):** Humahawak ng daan-daang payment screenshots araw-araw. Kailangan ng mabilisang pagsusuri ng screenshots nang hindi nag-a-upload ng customer data sa public servers.
- **Daily E-Wallet & Mobile Banking Users:** Kailangan ng proteksyon sa mga fake replenishment links at QR phishing kahit offline o ubos ang mobile data.

### **Proposed Solution**

Ang OpsScam ay nagpapatakbo ng 100% on-device triage engine. Sa loob ng isang screen, nagbabalik ito ng:

- **Verdict:** Scam, Suspicious, o Low Risk (hindi kailanman maglalabas ng label na "Safe").
- **Risk Score:** 0 hanggang 100\.
- **Highlighted Red Flags:** Minamarkahan ang mga kaduda-dudang salita o links sa mismong mensahe.
- **Actionable Taglish Explanation:** Maikling paliwanag kung bakit ito mapanganib at ano ang konkretong susunod na hakbang.

### **Success Metrics & Verification Targets**

- **Recall (Detection Rate):** \$\\ge 90\\%\$ ng scam messages ay matutukoy sa frozen test set.
- **False Alarm Rate:** \$\\le 10\\%\$ sa legitimate transactional messages (kabilang ang mga tunay na OTP texts).
- **Latency:** Sub-1 second para sa rule at ML scoring; \$\\le 8\$ seconds para sa buong Taglish explanation.
- **Data Confinement:** Zero outbound internet packets habang sinusuri ang mensahe.
- **Offline Execution:** 100% functional sa airplane mode.

### **Product Boundaries & Limitations**

- Hindi absolute guarantee ang risk assessment; nagbibigay ito ng probabilistic threat level.
- Hindi kayang patunayan ng app kung tunay ang nagpadala dahil kailangan noon ng direct telco o banking verification.
- Dahil sa Android security boundaries sa SMS reading, ang input mechanism ay naka-focus sa Copy-Paste, Android Share Target, at Screenshot import.

## **2\. Local AI Implementation (25%)**

### **The Edge Advantage (Bakit Local AI?)**

- **Data Minimization:** Ang sinusuri ay mga sensitibong mensaheng may financial tokens at identification data. Ang on-device execution ay nag-aalis ng panganib sa intercept o leaks.
- **Resilience Under Zero Signal:** Tumatakbo ang buong inference kahit walang Wi-Fi, walang data load, o nasa offline area.
- **Zero Variable Cost:** Walang recurring per-token cloud API cost, kaya nananatiling libre at accessible sa regular users.
- **Philippine Localization:** Direktang naka-tune sa mga karaniwang scam patterns sa bansa (GCash, BDO, Maya, LTO violations, DSWD ayuda, at Taglish social engineering).

### **Feature Architecture**

\[ User Input: Text / Link / Screenshot / QR \]  
 |  
 v  
 \+-------------+-------------+  
 | |  
 v v  
 \[ Layer 1: Rules Engine \] \[ ML Kit: Local OCR / Barcode \]  
 (Regex \+ Domain Analyzer) (Transforms image to local text)  
 | |  
 \+-------------+-------------+  
 |  
 v  
 \[ Layer 2: ML Classifier \]  
 (On-Device TF-IDF \+ Logistic)  
 |  
 v  
 \[ Fusion Engine \]  
 (Score Aggregation & Floor Enforcement)  
 |  
 \+-----------+-----------+  
 | |  
 (Fast Display) (Explanation)  
 | |  
 v v  
 \[ Instant Verdict \] \[ Layer 3: Local SLM \]  
 (Score & Red Flags) (llama.rn / GGUF Model)  
 |  
 (Fallback to)  
 |  
 v  
 \[ Template Engine \]

### **Technical Stack**

- **Client Framework:** React Native via Expo Development Build gamit ang TypeScript.
- **Heuristics Layer:** Deterministic TypeScript pattern matching para sa high-risk keywords at link structures.
- **ML Classifier:** Scikit-learn trained model (Character and Word TF-IDF \+ Logistic Regression) na naka-export sa pure JSON weight vectors para sa mabilis na on-device execution sa TypeScript nang walang Python runtime.
- **Vision / Document OCR:** Bundled on-device ML Kit Text Recognition at Barcode Scanning.
- **Local Language Model:** llama.rn na nagpapatakbo ng quantized GGUF model (e.g., SmolLM2 360M / Qwen 2.5 0.5B hanggang 1.5B Instruct).
- **Fallback Strategy:** Kapag lumagpas sa 8 seconds ang LLM inference, awtomatikong gagamitin ang pre-compiled deterministic Taglish template engine batay sa na-detect na flags.

### **Local vs. Internet Runtime Separation**

- **100% On-Device:** Rules evaluation, ML text classification, OCR document extraction, QR decoding, at language generation.
- **Build / Install Phase:** One-time APK installation at pre-bundled weights setup.
- **Zero Runtime Internet Permission:** Ang demo production APK ay bubuuin nang walang android.permission.INTERNET sa AndroidManifest.

## **3\. Technical Execution (20%)**

### **Three-Layer Pipeline & Execution Targets**

> 1. **Layer 1: Rules & Domain Heuristics (\$\\le 50\\text{ ms}\$):**

- Sinusuri ang OTP/MPIN requests, account threats, government agency names, at lookalike domains (e.g., gcash-verify.com vs gcash.com).
  > 2. **Layer 2: Lightweight ML Text Classifier (\$\\le 100\\text{ ms}\$):**
- Kumikilala sa novel sentence structures at bagong phishing scripts gamit ang word at character n-grams.
  > 3. **Layer 3: Local SLM / Template Explainer (\$\\le 8\\text{ seconds}\$):**
- Nag-a-analyze ng input context para makabuo ng structured JSON response na naglalaman ng summary at susunod na gagawin.

### **Scoring Logic & Fusion Formula**

Ang bawat indicator ay may kaukulang weight points:

- **High-Severity Flags:** OTP/MPIN/ID credentials request (+60 pts), Lookalike domain ng established brand (+45 pts), direct APK download link (+35 pts), remote management app prompt (+30 pts).
- **Contextual Flags:** Fake parcel fee request (+25 pts), account threat (+20 pts), ayuda o raffle claim (+20 pts), urgency o link shorteners (+15 pts bawat isa).
- **Legitimate Transaction Protection (Real OTP Rule):** Kung ang mensahe ay naglalaman ng numeric code, explicitly may "do not share", at walang kasamang suspicious link, magbabawas ito ng 60 points (-60 pts) upang maiwasan ang false positive.

Kapag gumagana ang ML classifier, kinakalkula ang final score gamit ang weighted fusion:

\$\$\\text{Score} \= (0.6 \\times R) \+ (0.4 \\times (100 \\times P))\$\$  
_kung saan ang \$R\$ ay ang Rules score (\$0\\text{--}100\$) at ang \$P\$ ay ang ML probability (\$0\\text{--}1\$)_.  
**Verdict Cutoffs:**

- \$\\ge 60\$: **Scam \- l**

- \$30\\text{ to }59\$: **Suspicious**

- \$\< 30\$: **Low Risk**

**Architectural Safeguards:**

- **Floor Protection:** Ang mga high-severity flags ay nagsisilbing score floor; hindi maaaring pababain ng mababang ML score ang isang lantad na credential phishing attempt.
- **LLM Output Restriction:** Hindi pinahihintulutan ang LLM na magpababa ng verdict score; maaari lamang itong magtaas ng risk level kung may makita itong malinaw na banta na lumagpas sa rules.

## **4\. Innovation (15%)**

### **Key Differentiators**

- **Explanatory Diagnostics in Taglish:** Hindi lang nagbibigay ng binary flag ang system; tinuturuan nito ang user kung aling mga linya ang mapanlinlang upang mapataas ang kanilang fraud awareness.
- **Universal Multi-Input Hub:** Parehong dumadaan sa iisang local intelligence pipeline ang raw text, pasted links, screenshot OCR, at camera QR codes.
- **Content-Centric Verification:** Hindi nakadepende ang OpsScam sa central phone number blacklist; sinusuri nito ang mismong nilalaman at semantika ng mensahe kahit manggaling ito sa bagong registered SIM.
- **Adversarial Prompt Hardening:** Ang mga input messages ay itinuturing bilang raw untrusted strings sa evaluation pipeline, kaya hindi ito madaling ma-bypass ng embedded injection prompts.

## **5\. Product & Demo Quality (15%)**

### **User Interface Architecture**

- **Main Dashboard:** Malinis na layout na may Quick Paste button, Screenshot file picker, QR Code scanner button, at dalawang offline preset samples.
- **System Share Integration:** Lumalabas ang OpsScam sa native Android Share Sheet para sa direktang pagsusuri mula sa SMS app, Messenger, o Viber.
- **Diagnostic Card:**
  - Malaking readable text verdict (Scam / Suspicious / Low Risk) na may kaukulang numeric indicator.
  - Raw message display kung saan naka-highlight ang triggers.
  - Taglish rationale at 2 clear practical bullet steps.
  - Offline Telemetry Banner: Nagpapakita ng zero internet connection badge at per-layer compute latency.

### **5-Minute Demo Day Presentation Script (Cyberzone, SM Makati)**

- **0:00 \- 0:30 (Context):** Ipakita ang tipikal na sitwasyon ng isang Pilipinong nakatanggap ng "urgent GCash deactivation warning" sa gabi.
- **0:30 \- 1:00 (Offline Verification):** I-on ang Airplane Mode sa demo Android phone; buksan ang Android App Settings para patunayang walang network access permissions ang app.
- **1:00 \- 2:00 (Live Phishing Detection):** I-paste ang fake GCash notification via share sheet; ipakita ang sub-second Scam verdict at Taglish explanation.
- **2:00 \- 2:30 (Hard Negative Verification):** I-paste ang tunay na bank OTP notification; ipakita na nananatili itong Low Risk at hindi nagkakaroon ng false alarm.
- **2:30 \- 3:30 (Screenshot & QR Analysis):** Mag-upload ng screenshot ng payment voucher at i-scan ang sample phishing QR code gamit ang on-device ML Kit integration.
- **3:30 \- 4:15 (Technical Architecture):** Talakayin ang local 3-layer architecture, quantization strategy, at evaluation metrics sa harap ng technical judges.
- **4:15 \- 5:00 (Closing):** I-reiterate kung bakit Local AI ang tamang arkitektura para sa proteksyon ng personal data.

## **6\. Scope, Roadmap & Milestones**

### **Feature Boundaries**

- **In-Scope (Deliverables bago mag-10:00 AM bukas):**
  - Android APK (React Native / Expo dev client).
  - Text at link inspection engine.
  - Android Share Target support.
  - Three-tier evaluation pipeline (Heuristics, TF-IDF ML, Local SLM / Template).
  - Local ML Kit OCR at QR decoding.
  - Evaluation verification script sa repository.
  - Public GitHub repository na may buong setup instructions at 1-minute demo video.

- **Explicitly Dropped Scope (To Protect Build Deadline):**
  - Call audio listening / real-time transcription via whisper.rn (inalis upang maiwasan ang native compilation issues).
  - Background automatic SMS interception (gumagamit ng direct paste at share target dahil sa modern Android security restrictions).
  - iOS platform build (Android target only para sa hackathon).

### **Target Execution Timeline**

\[Oct 9: 2:30 PM \- 5:30 PM\] Setup, Expo dev build, Native modules, Classifier training\[cite: 51\]  
\[Oct 9: 5:30 PM \- 9:00 PM\] Core rules, TF-IDF scoring in TypeScript, Local ML Kit OCR setup\[cite: 51\]  
\[Oct 9: 9:00 PM \- 1:00 AM\] Integration ng llama.rn / template fallback, UI implementation\[cite: 51\]  
\[Oct 10: 1:00 AM \- 3:00 AM\] Frozen test set verification, latency checks, offline validation\[cite: 51\]  
\[Oct 10: 3:00 AM\] \---------- HARD FEATURE FREEZE \----------\[cite: 50, 51\]  
\[Oct 10: 3:00 AM \- 6:00 AM\] Edge-case bug fixing, UI polish, release APK compilation\[cite: 51\]  
\[Oct 10: 6:00 AM \- 8:30 AM\] Demo video recording, LinkedIn/X upload (\#AppBuildersPH)\[cite: 16, 24, 51\]  
\[Oct 10: 8:30 AM \- 9:15 AM\] README documentation, disclosure write-up, Cerebral Valley submission\[cite: 16, 25, 51\]  
\[Oct 10: 10:00 AM\] \--------- OFFICIAL SUBMISSION DEADLINE \---------\[cite: 16, 25, 51\]

## **7\. MVP**

Here….

1. **Text and link checker:** paste or share a message and get a verdict, score, highlighted red flags, a Taglish explanation and next steps.
2. **Share to OopsScam:** the app appears in Android's share menu, so a suspicious text or screenshot can be sent in without copying.
3. **Rules engine:** catches OTP, MPIN and ID requests (ignoring "do not share" wording), urgency, prize and fee language, account threats, APK and remote-access requests, and emergency-relative stories.
4. **Link analysis:** flags shorteners, odd domain endings, IP-address links, lookalike domains and brand-versus-link mismatches.
5. **Real-OTP protection:** doesn't flag genuine OTP messages that say "do not share" and have no link.
6. **ML classifier:** scores new wording the rules miss, trained on a laptop and run on the phone from an exported weights file.
7. **Local LLM explainer:** writes the Taglish reason and next steps through llama.rn, falls back to templates if slow, and cannot lower a verdict.
8. **Offline status panel:** shows model status and per-stage timings, and the demo build has no internet permission.
