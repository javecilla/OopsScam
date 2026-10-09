# Evaluation: email_test (2026-10-10)

40 messages (20 scam, 20 legit). Same `src/core` + `src/ml` code as the app; no rule, weight or threshold was changed.
Targets (PLAN.md): recall 90% or more, false alarms 10% or less. These are measured numbers on a small, AI-written set; they are a smoke check, not a benchmark.
Scored with the email classifier (input looks like an email, as in the app): 38 of 40; the rest with the SMS classifier.

| Config | Recall | Precision | F1 | False-alarm rate | Recall (Scam verdict only) | False alarms (Scam verdict only) |
| --- | --- | --- | --- | --- | --- | --- |
| App (rules + classifier) | 95.0% | 86.4% | 90.5% | 15.0% | 85.0% | 0.0% |
| Rules only | 85.0% | 94.4% | 89.5% | 5.0% | 60.0% | 0.0% |

"Flagged" = verdict Suspicious or Scam (FR-EV-02).

## Confusion matrix (app config)

| Label \ Verdict | Scam | Suspicious | Low risk |
| --- | --- | --- | --- |
| scam | 17 | 2 | 1 |
| legit | 0 | 3 | 17 |

## Per category (app config): share flagged

| Category | Label | n | Flagged |
| --- | --- | --- | --- |
| bank_statement | legit | 1 | 0 (0.0%) |
| bill_reminder | legit | 2 | 0 (0.0%) |
| booking_confirmation | legit | 1 | 0 (0.0%) |
| delivery_notice | legit | 1 | 0 (0.0%) |
| gov_announcement | legit | 2 | 1 (50.0%) |
| job_application | legit | 1 | 1 (100.0%) |
| order_update | legit | 2 | 0 (0.0%) |
| otp | legit | 1 | 0 (0.0%) |
| personal_email | legit | 1 | 1 (100.0%) |
| promo | legit | 1 | 0 (0.0%) |
| school_office | legit | 2 | 0 (0.0%) |
| security_notice | legit | 3 | 0 (0.0%) |
| transaction_receipt | legit | 2 | 0 (0.0%) |
| account_threat_link | scam | 3 | 3 (100.0%) |
| bill_fee_link | scam | 1 | 1 (100.0%) |
| credential_request | scam | 3 | 3 (100.0%) |
| government_impersonation | scam | 2 | 2 (100.0%) |
| job_loan_investment | scam | 3 | 3 (100.0%) |
| marketplace_scam | scam | 1 | 1 (100.0%) |
| other_scam | scam | 2 | 1 (50.0%) |
| parcel_fee | scam | 1 | 1 (100.0%) |
| prize_raffle_ayuda | scam | 2 | 2 (100.0%) |
| remote_access | scam | 1 | 1 (100.0%) |
| sender_spoof | scam | 1 | 1 (100.0%) |

## Latency on this laptop (Node), not the phone

Rules: median 0.28 ms, worst 1.80 ms. Classifier: median 0.92 ms, worst 7.28 ms.

## Missed scams (1)

- `em-s015` (score 13): From: Ramon Villanueva <ramon.villanueva.ceo@gmail-office.example>
Subject: Quick favor

Hi,

Are you at your desk? I need you to buy six PHP 2,000 gift cards for a client today. Keep this between us for now, I will explain later. Send me the codes by email as soon as you have them.

Ramon
Sent from my phone

## False alarms (3)

- `em-l013` suspicious (score 37; gov_agency): From: SSS <noreply@sss.gov.ph>
Subject: Contribution payment posted

Dear Member,

Your contribution payment of PHP 1,140.00 for September 2026 has been posted to your SSS record. You may view your contributions in My.SSS or the SSS Mobile App.

Social Security System
- `em-l014` suspicious (score 50; fee_request, job_loan_investment): From: Talent Acquisition <careers@northwindsolutions.example>
Subject: We received your application

Dear Maria Santos,

Thank you for applying for the Junior Accountant position. Our recruitment team is reviewing applications and will contact shortlisted candidates for an interview within two weeks. We never charge applicants any fee during hiring.

Best regards,
Talent Acquisition Team
- `em-l017` suspicious (score 32; ): Hi Carlo,

Kumusta! Para sa outing natin sa Batangas, P1,500 per head ang share sa resort. Paki-send na lang sa GCash ko bago mag-Friday para ma-reserve na natin. Kita-kits!

Salamat,
Bea
