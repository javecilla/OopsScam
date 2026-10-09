# Philippine scam patterns (2025 to 2026)

Compiled 2026-10-09 by Claude Code (AI) with web search; review by the team pending. Sources are the public warnings found for each pattern. Their titles and summaries were read through search results; the pages were not opened one by one, so a teammate should spot-check the links before quoting them in the pitch. Where no official advisory was found, the entry says so (`source: partial`).

The example messages are original text that follows each pattern. None is copied from an advisory, and every link uses a reserved domain (`.example`). Each pattern has one example in each split, with matching row numbers: pattern `Pnn` is row `s0nn` in `data/train/expanded_2026-10.csv` (`tr2-`), `data/dev/dev.csv` (`dev-`) and `data/test_v2/test_v2.csv` (`tv2-`). Those rows have `source: advisory-pattern` and `notes: pattern:Pnn`.

| ID | Pattern | Category | Examples |
| --- | --- | --- | --- |
| P01 | E-wallet "account on hold" | account_threat_link | tr2-s001, dev-s001, tv2-s001 |
| P02 | Fake bank "unusual transaction" alert | account_threat_link | tr2-s002, dev-s002, tv2-s002 |
| P03 | Bank "new device / Add Device" OTP trick | credential_request | tr2-s003, dev-s003, tv2-s003 |
| P04 | Telco rewards points expiring | prize_raffle_ayuda | tr2-s004, dev-s004, tv2-s004 |
| P05 | LTO traffic-violation fine by text | government_impersonation | tr2-s005, dev-s005, tv2-s005 |
| P06 | Government ayuda / cash aid link | prize_raffle_ayuda | tr2-s006, dev-s006, tv2-s006 |
| P07 | Parcel address update / redelivery fee | parcel_fee | tr2-s007, dev-s007, tv2-s007 |
| P08 | Task scam (like and follow, then deposits) | job_loan_investment | tr2-s008, dev-s008, tv2-s008 |
| P09 | Advance-fee loan approval | job_loan_investment | tr2-s009, dev-s009, tv2-s009 |
| P10 | Guaranteed-return investment | job_loan_investment | tr2-s010, dev-s010, tv2-s010 |
| P11 | Relative in an emergency, new number | emergency_relative | tr2-s011, dev-s011, tv2-s011 |
| P12 | Fake app / APK or remote-access install | remote_access_apk | tr2-s012, dev-s012, tv2-s012 |
| P13 | QR phishing ("quishing") | qr_phishing | tr2-s013, dev-s013, tv2-s013 |
| P14 | Marketplace overpayment and refund | marketplace_scam | tr2-s014, dev-s014, tv2-s014 |
| P15 | SIM registration / deactivation | other_scam | tr2-s015, dev-s015, tv2-s015 |
| P16 | Fake text inside a real e-wallet thread | account_threat_link | tr2-s016, dev-s016, tv2-s016 |
| P17 | Unpaid toll / RFID | other_scam | tr2-s017, dev-s017, tv2-s017 |
| P18 | Warrant of arrest / police case | government_impersonation | tr2-s018, dev-s018, tv2-s018 |

---

## P01: E-wallet "account on hold"

- **How it works:** A text says the GCash or Maya wallet is "on hold", frozen or failed verification, and links to a fake login page that asks for the mobile number, MPIN and OTP.
- **Red flags:** account threat, a deadline, a link, a request for MPIN/OTP.
- **Source:** GCash says it never sends links by SMS/chat and never asks for MPIN or OTP; describes the "nakahold ang account mo" scam. https://malaya.com.ph/info-tech/cybersecurity/e-wallet-phishing-is-latest-social-engineering-method ; https://tribune.net.ph/2025/10/30/public-cautioned-vs-scams

## P02: Fake bank "unusual transaction" alert

- **How it works:** A text that looks like a bank alert reports a large unusual transaction and links to a page to "cancel" it. It may land in the bank's real SMS thread.
- **Red flags:** a scary amount, "if this wasn't you", a link that is not the bank's domain.
- **Source:** Report of BPI- and BDO-styled scam texts (2026). https://interaksyon.philstar.com/rumor-cop/2026/07/09/316097/pinoys-warned-scam-texts-appearing-come-banks/amp/

## P03: Bank "new device / Add Device" OTP trick

- **How it works:** The scammer triggers or imitates a bank security alert and gets the victim to reply "Add Device" or forward the OTP, registering the scammer's phone.
- **Red flags:** asks you to reply with or forward an OTP; claims doing so "blocks" a device.
- **Source:** BDO advisory on mobile device takeover (listed in search; the page timed out when fetched). https://bdo.com.ph/node/64132 ; https://malaya.com.ph/business/enterprise/bdo-cautions-clients-vs-scammers

## P04: Telco rewards points expiring

- **How it works:** A text says thousands of rewards points expire today and links to a fake redemption page that collects personal and bank details or charges a "fee".
- **Red flags:** expiring points, a link. Globe says its official SMS never contain links.
- **Source:** https://www.globe.com.ph/about-us/newsroom/corporate/globe-warns-vs-spoofed-messages-for-rewards-claims ; https://alpha.pna.gov.ph/articles/1223193

## P05: LTO traffic-violation fine by text

- **How it works:** A text claims an unsettled violation (for example the Anti-Distracted Driving Act) with a fine due within 24 hours and a lookalike LTO link.
- **Red flags:** fine plus deadline plus link. LTO says it does not send violations by text; the real portal is on lto.gov.ph.
- **Source:** https://interaksyon.philstar.com/rumor-cop/2025/11/13/304429/public-lto-text-scam-traffic-violation/ ; https://newsinfo.inquirer.net/1936833/lto-warns-public-about-fake-traffic-violation-sent-via-text-messages

## P06: Government ayuda / cash aid link

- **How it works:** A text or post says you qualify for DSWD aid (AKAP, fuel voucher, flood aid) and must register through a link or give an OTP.
- **Red flags:** random "approval", a registration link, an OTP request. DSWD says it does not send links by text and does not pick beneficiaries by text.
- **Source:** https://newsinfo.inquirer.net/2201280/dswd-issues-warning-vs-text-scams-posing-as-cash-aid-rollout ; https://verafiles.org/articles/fact-check-no-10k-cash-aid-from-dswds-akap

## P07: Parcel address update / redelivery fee

- **How it works:** A text says a parcel cannot be delivered (incomplete address) and asks for a small fee, such as P17.05, by card through a link.
- **Red flags:** parcel plus small fee plus link. PHLPost says it does not ask for card details or OTPs by text.
- **Source:** https://philstarlife.com/news-and-views/638516-phlpost-scam-text-messages-posing-as-post-office ; https://tribune.net.ph/2026/08/23/phlpost-warns-public-against-smishing-scams

## P08: Task scam (like and follow, then deposits)

- **How it works:** "Easy online job" liking or following posts pays small amounts at first, then asks for growing deposits for "VIP tasks"; withdrawals get blocked.
- **Red flags:** pay before you earn, guaranteed commission, move to Telegram/WhatsApp.
- **Source:** PNP-ACG warning on task scams. https://newsinfo.inquirer.net/1829589/public-warned-vs-task-scams-online ; https://mirror.pia.gov.ph/news/2023/09/06/pnp-acg-warns-public-over-surge-in-task-scam-incidents

## P09: Advance-fee loan approval

- **How it works:** An unsolicited "loan approved" message asks for a processing or insurance fee before release; the loan never comes. It often borrows a licensed lender's name.
- **Red flags:** fee before release, payment to a personal account.
- **Source:** SEC advisories. https://fintechnews.ph/68819/security/sec-warns-public-against-28-fake-lending-pages-facebook-scams/ ; https://business.inquirer.net/608069/sec-warns-public-vs-fake-bestloan-agent

## P10: Guaranteed-return investment

- **How it works:** An invitation to an investment or crypto group promising fixed daily or weekly returns.
- **Red flags:** "guaranteed", very high returns, urgency ("limited slots"), secrecy.
- **Source:** SEC warnings on schemes promising quick returns. https://malaya.com.ph/business/corporate/sec-flags-investment-schemes-promising-quick-returns ; https://alpha.pna.gov.ph/articles/1099939

## P11: Relative in an emergency, new number

- **How it works:** "Ma/Nay, this is my new number": the "child" is in hospital, in an accident or under arrest and needs money now, and asks you not to tell anyone.
- **Red flags:** new number, emergency, money request, secrecy.
- **Source:** `source: partial`. The closest official warning found is NTC's 2015 telco text blast on people pretending to be relatives asking for money or load. https://www.philstar.com/business/2015/09/05/1496479/ntc-orders-text-blasts-warn-vs-scams/amp/

## P12: Fake app / APK or remote-access install

- **How it works:** A message says your bank, e-wallet or National ID needs an "update" and links to an .apk outside the Play Store, or a "support agent" asks you to install AnyDesk/TeamViewer. The app takes over the phone.
- **Red flags:** .apk link, install instructions, remote-access app names.
- **Source:** https://context.ph/2025/09/15/kaspersky-warns-of-fake-apps-targeting-filipino-users/ ; https://gulfnews.com/world/asia/philippines/he-tapped-a-government-app-then-his-over-ph1-million-life-savings-vanished-1.500521612

## P13: QR phishing ("quishing")

- **How it works:** A fake QR (on posters or receipts, or pasted over a store's real code) leads to a lookalike payment or login page, or sends payments to the scammer.
- **Red flags:** QR in an unexpected place, a "new" store QR, a link that is not the brand's domain, asking for MPIN after scanning.
- **Source:** https://www.sunstar.com.ph/manila/pnp-warns-vs-fake-qr-code-scams-stealing-money-personal-data ; https://www.philstar.com/banking/2026/04/23/2523046/gcash-upholds-zero-tolerance-quishing-scam-blocks-fake-illegal-sites ; https://fintechalliance.ph/bsp-advises-consumers-to-verify-qr-codes-to-avoid-quishing/

## P14: Marketplace overpayment and refund

- **How it works:** A "buyer" offers full price or more, sends a fake payment screenshot showing an overpayment, and asks the seller to refund the difference to another account. Variants: a fake courier or payment link, or "pay the shipping/insurance first".
- **Red flags:** overpayment, a refund to a different account, payment proof only as a screenshot, links to "receive" money.
- **Source:** https://interaksyon.philstar.com/trends-spotlights/2024/04/02/273104/how-to-protect-scams-fb-marketplace/

## P15: SIM registration / deactivation

- **How it works:** A text claims the SIM will be deactivated today because registration is incomplete, and links to a form asking for ID and personal data.
- **Red flags:** deadline, a link, an ID upload request.
- **Source:** `source: partial`. No specific advisory found. NTC's general guidance against clicking links in texts: https://www.abs-cbn.com/business/09/13/22/ntc-orders-telcos-to-deactivate-clickable-links-in-malicious-texts

## P16: Fake text inside a real e-wallet thread

- **How it works:** Using fake cell towers or spoofing, scam texts appear in the same thread as genuine GCash/Maya messages, usually a "new login" or "verify" alert with a link.
- **Red flags:** a link in a brand thread that normally has none; a login alert you did not trigger.
- **Source:** CICC warning (Nov 2024). https://technology.inquirer.net/138367/cicc-warns-vs-text-scam-that-sneaks-into-legit-message-threads/amp

## P17: Unpaid toll / RFID

- **How it works:** A text posing as Easytrip or Autosweep says there is an unpaid toll and threatens a penalty or RFID deactivation unless you pay through a link.
- **Red flags:** small unpaid amount, penalty threat, a link.
- **Source:** `source: partial`. Only a law-firm commentary was found, no official advisory. https://www.respicio.ph/commentaries/legal-steps-to-report-toll-evasion-scam-and-fraudulent-phone-alerts

## P18: Warrant of arrest / police case

- **How it works:** A message posing as the PNP, NBI or CIDG says a case or warrant was filed and demands a "settlement" to cancel it.
- **Red flags:** arrest threat, payment to "cancel" a case, a private number.
- **Source:** https://www.gmanetwork.com/news/topstories/nation/912424/pnp-warns-against-warrant-of-arrest-scams/story

---

Reporting (for the app's next-step text): CICC Inter-Agency Response Center hotline 1326, as cited in the CICC, PHLPost and Globe coverage above.
