GWYN IDEA:

25%  
\- problem: yung mga hirap mag salita madeliver nila yung gusto nilang sabihin   
\- solution: and mabilis ma intindihan ng normal people yung gusto iparating ni user na hirap mag salita  
\- target audience: helps mga ngongo, mga stroke, pwd nag sobrang hirap mag salita, stuttering  
\- ehancer for those speech dificiency  
\- goal is to transform yung mga magugulong salita, into much understandable sentences or words  
\- limitation: if other native and some filipino slang languages speaking

25%  
\- LOCAL AI  
\- speech recognition that can use to help people that stammer speak  
\- impact: both part will make the communication with ease, it can help build confidence in public speaking  
\- AI MODEL get in Hugging face along with the datasets, GEMMA / LAMMA 8b  
\- SPEECH RECOG: web speech api as default option  
\- WHY US:  
1\. pure local and no internet required  
2\. reliable and secure since data is nasa phone lang ni user  
3\. free to use, zero marginal cost

\- BAKIT HINDI YUNG IBANG APP:  
1\. they required internet E.G., iYASO.AI  
2\. your data is uploaded to their server  
3\. may bayad, cost per use

OUR APP FEAUTURESS:  
\- user can used the app without login or creating account  
\- every time user use the app mag bu build siya ng profile niya sa system, nyare alam ni ai na hirap siya mag salita ng words na may "R" or "S" (analytics)  
\- personalize tips for users kung saang part siya hirap mag salita na word or letter.  
\- supported language: pure tagalog, english or english-tagalog (taglish)

TECH STACK:  
\- Mobile app  
\- REACT native  
\- database: sql lite  
\- local ai instead of cloud because of the ff: realibility, accessbility, and confidentialty ng data  
\- ai from hugging face open weights model

---

JOHNREY IDEA:  
Scam guardian

25%  
\- problem: araw araw nakakareceive tayo ng Gcash o bank alert, sms phishing, or otps dahil dito marami din nasscam dahil yung ibang messages na ito mukhang totoo that results lost of money 

\-solution : Isang scam checker na tumatakbo sa mismong device, kaya private, mabilis, at gumagana kahit offline. Ang user ay maglalagay ng text o link, o mag-uupload ng larawan (screenshot o QR code).

For every input the app returns four things on one screen:  
• A verdict: Scam, Suspicious, or Low risk (never "safe").  
• A score from 0 to 100\.  
• The red flags it found, highlighted in the message.  
• A short Taglish explanation and what to do next.

\- target users : Mga senior at lola/lolo, Mga online sellers, mga e-wallet users

\- goal: Create a local scam checker that is 100% on-device for analysis: it reads texts, links, screenshots and QR codes, works fully offline, and keeps every message private.  
Two network uses exist and both are optional: a one-time model download before use, and an update of the scam-pattern list. The update is off by default and never uploads a message.

\- limitation:  
 not 100% accurate, Nagbibigay lang ito ng risk level, Android restricts SMS and call-audio access, so input is paste, share or screenshot.

25%

\- WHY US:

\- BAKIT HINDI YUNG IBANG APP:

\-OUR APP FEAUTURESS:

\-TECH STACK:

---

RAI IDEA:

25%  
Problem:   
\- fresh graduates and first-time minimum wage job seekers ay madalas sabik at desperadong magka-trabaho, kaya pumipirma agad nang hindi binabasa o naiintindihan ang kontrata.- 

Solution:   
\- "Scan Before You Sign" (Preventative Contract Auditor): Isang on-device AI scanner na agad nagfa-flag ng mga dehado at ilegal na clauses sa Job Offer o Kontrata bago ito pirmahan ng aplikante.

Target Audience:   
    \- Fresh college at vocational graduates na papasok sa corporate/BPO/tech.  
    \- Entry-level service crew, cashiers, promodisers, at contractual minimum wage workers.

Goal:   
\- Translate the confusing legal terms or jargons into Simple Terms (e.g., "Red Flag: May 2-year bond na may 100k penalty kahit entry level lang ang salary)  
\- A polite counter-offer script guide para alam kung paano kakausapin ang HR nang maayos to adjust the contract

Limitation:   
\- Philippine labor laws and private employement contracts only (overseas/OFW contracts are not covered)

25%  
\- LOCAL AI  
\- On-device document scanner and small language model that can audit contracts and detect labor violations  
\- Impact: Applicants will have less chance to be tricked by confusing legal terms or jargon set by companies, and will have confidence to negotiate their contract  
\- AI MODEL get in Hugging face along with the datasets, LLAMA 3.2 1B-3B / QWEN 1.5B  
\- CONTRACT SCANNER: on-device OCR (ML Kit / Apple Vision / Tesseract) as default option

WHY US:  
\- Pure Local and No internet Required  
\- Reliable and Secure since confidential contracts and NDAs nasa phone lang ni user (zero data leaks)  
\- free to use, zero marginal cost

BAKIT HINDI YUNG IBANG APP:  
\- They require internet E.G., ChatGPT, Claude, commercial legal-tech  
\- Your private contract data is uploaded to their server (pwedeng ma-violate ang company NDA)  
\- May bayad, subscription or cost per token

OUR APP FEATURES:  
\- User can use the app without login or creating account (zero digital footprint, safe sa employer retaliation)  
\- Everytime User scans a contract, nag b-build siya ng profile o work history sa system, for example. Pang limang 5 month contractual contract mo nanaman o below minimum wage yung offer  
\- personalized tips at polite negotiation scripts for users kung paano kakausapin si HR para ipatanggal yung unfair clause nang hindi nababawi ang job offer  
\- supported language: pure tagalog, english or english-tagalog (taglish)

TECH STACK:  
\- Platform: Mobile app  
\- Language: REACT native  
\- Database: sqlite  
AI: local ai instead of cloud because of the ff: confidentiality ng private contracts (NDA-safe), accessibility kahit walang load, and zero cost sa job seekers  
\- ai from hugging face open weights model

---

JEROME IDEA: LINAW-LEGAL (Confidential On-Device Contract & Loan Auditor)  
25% Problem & Usefulness

Problem: Maraming ordinaryong Pilipino ang pumipirma sa mga predatory online lending contracts at employment agreements nang hindi naiintindihan ang legal jargon at hidden interest rates, habang delikadong mag-upload ng legal contracts sa public cloud AI dahil naglalaman ito ng buong pangalan, pirma, at personal identification records.

Solution: Isang lightweight, confidential on-device contract auditor na gumagamit ng fast local CPU OCR na ipinapasa sa isang quantized local Small Language Model upang mag-extract ng high-risk clauses nang walang lumalabas na data sa device.

Target Audience: Gig economy workers, job seekers, at mga kumukuha ng online micro-loans.

Goal: Makapag-generate ng 3-bullet breakdown ng real monthly/annual interest rates, wage penalty clauses, at legal red flags sa payak na Taglish sa loob ng 5 hanggang 10 segundo on-device.

Impact: Pinoprotektahan ang mga mahihinang sektor laban sa harassment ng predatory lending apps at unfair labor contracts nang may 100% data privacy at zero cloud cost.

Limitation: Nakasalalay ang linaw ng text extraction sa kalidad ng litrato o scan ng kontrata bago iproseso ng local SLM.

25% Local AI Implementation

Local Inference Pipeline:  
On-Device OCR Engine: Tesseract.js o PaddleOCR-Lite na tumatakbo nang buo sa local CPU para kunin ang raw text mula sa uploaded image o dokumento nang zero GPU overhead.  
Quantized Local SLM: Llama 3.2 3B Instruct o Qwen 2.5 1.5B (4-bit quantized, Q4\_K\_M) na tumatakbo gamit ang Ollama o llama.cpp para sa analysis at translation sa Taglish.  
Bakit Local AI at Hindi Cloud (The Edge Advantage):  
Non-Negotiable PII Privacy: Ang mga kontrata ay may valid ID numbers, buong tirahan, pirma, at salary figures; sa local execution, zero bytes ang umaalis sa laptop o device.  
Zero Cloud Inference Cost: Walang babayarang per-token pricing o subscription sa mga third-party APIs kahit magbasa ng mahahabang kontrata.  
Offline Resilience: Magagamit pa rin ito ng mga aplikante o manggagawa kahit offline o nasa lugar na walang internet bago pumirma sa papel.  
Bakit Hindi Cloud Alternatives:  
Ang cloud-based legal parsers ay nangangailangan ng internet access, nag-iimbak ng data sa external servers, at may risk ng data breach o corporate profiling.

20% Technical Execution

Frontend at Application Layer: Next.js o React desktop wrapper para sa mabilis at malinis na interface.  
Local Parsing Engine:  
Client-side OCR via WebAssembly / Tesseract para sa imahe at PDF text extraction.  
Heuristic Regex Pre-filter para kunin ang mga sections na may keywords tulad ng "interest", "penalty", "deduction", at "default".  
Local SLM Runtime: Ollama o llama.cpp local endpoint na tumatakbo sa localhost na may structured JSON output prompt.  
Input-Output Architecture:  
\$\$\\text{Contract Image / PDF} \\xrightarrow{\\text{Local OCR}} \\text{Raw Text} \\xrightarrow{\\text{Regex Filter}} \\text{Risk Sections} \\xrightarrow{\\text{Local 1.5B/3B SLM}} \\text{Taglish 3-Bullet Breakdown}\$\$

15% Innovation

Effective Interest Rate (EIR) Calculator: Hindi lang nagbabasa ng text ang local pipeline; awtomatiko nitong kinukuha ang stated "nominal daily fee" (halimbawa: 1% per day) at kino-convert ito sa tunay na Annual Percentage Rate (APR) upang ibunyag ang totoong bigat ng utang.  
Red Flag Severity Matrix: May on-device classifier na naghihiwalay sa Standard Clauses vs Abusive Clauses (tulad ng automatic salary deductions o contact harassment clauses) gamit ang open-source regulatory guidelines.  
15% Product & Demo Quality

Drop & Analyze UX: Simple drag-and-drop box para sa picture o PDF ng kontrata nang walang anumang login o form sign-up barrier.  
Clear 3-Card Summary View:  
Card 1: Real Financial Cost (e.g., "Sinasabi 3% lang, pero sa totoo ay 36% kada taon").  
Card 2: Red Flags (e.g., "Bawal mag-resign nang walang 60-day penalty fee").  
Card 3: Taglish Advice (Simpleng payo kung ano ang dapat linawin bago pumirma).  
Live Demo Reliability: Dahil lightweight OCR at 1.5B/3B model lang ang gamit, mabilis ang execution time at hindi magla-lag ang makina sa mismong harap ng mga hurado  
