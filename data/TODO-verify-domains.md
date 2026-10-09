# Brand domains to verify by hand

`src/core/brands.json` marks a domain `verified: true` only when it was opened on 2026-10-09 and the page named the brand in its title or copyright line. These entries could not be confirmed that way. A teammate should open each brand's official site (from a trusted source such as the brand's app, a bank card, or an official government directory), confirm the domain, then set `verified: true`, `verified_source` and `verified_on` in `brands.json`.

| Brand | Domain(s) in brands.json | Why not verified |
| --- | --- | --- |
| Maya | maya.ph, paymaya.com | maya.ph confirmed (title + copyright on 2026-10-09); paymaya.com not checked |
| BDO | bdo.com.ph | site timed out |
| LandBank | landbank.com | page came back empty |
| UnionBank | unionbankph.com | HTTP 403 |
| Security Bank | securitybank.com | HTTP 403 |
| Globe | globe.com.ph | HTTP 403 |
| J&T Express | jtexpress.ph | page came back empty |
| Flash Express | flashexpress.ph | only a browser security-check page |
| Shopee | shopee.ph | page came back empty |
| GSIS | gsis.gov.ph | request rejected |
| Pag-IBIG | pagibigfund.gov.ph | reCAPTCHA page |
| LTO | lto.gov.ph | HTTP 403 (news cites portal.lto.gov.ph) |
| DOLE | dole.gov.ph | HTTP 403 |
| DFA | dfa.gov.ph | HTTP 403 |
| OWWA | owwa.gov.ph | HTTP 403 |
| PNP | pnp.gov.ph | HTTP 403 |
| CICC | cicc.gov.ph | HTTP 403 |
| DICT | dict.gov.ph | HTTP 403 |
| NTC | ntc.gov.ph | HTTP 403 |

Not in the list because no domain could be confirmed at all: Autosweep (toll RFID), eGovPH, DTI, TNT (Smart prepaid brand), Facebook/Meta. Add them only with a confirmed domain.

Verified on 2026-10-09 (23): GCash (gcash.com), GoTyme Bank (gotyme.com.ph), BPI (bpi.com.ph), Metrobank (metrobank.com.ph), PNB (pnb.com.ph), RCBC (rcbc.com), China Bank (chinabank.ph), Smart (smart.com.ph), DITO (dito.ph), LBC (lbcexpress.com), PHLPost (phlpost.gov.ph), Ninja Van (ninjavan.co), Lalamove (lalamove.com), Grab (grab.com), Lazada (lazada.com.ph), Meralco (meralco.com.ph), Easytrip (easytrip.ph), SSS (sss.gov.ph), PhilHealth (philhealth.gov.ph), BIR (bir.gov.ph), DSWD (dswd.gov.ph), NBI (nbi.gov.ph), BSP (bsp.gov.ph).
