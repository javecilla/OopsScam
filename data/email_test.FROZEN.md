# email_test: FROZEN

| | |
| --- | --- |
| File | `data/email_test/email_test.csv` |
| Rows | 40 (20 scam, 20 legit) |
| SHA-256 | `375ff021aa1b650da91f49acd9178c19088f217156ca4a01a37f7d2c455525f2` |
| Frozen at | 2026-10-10 03:38:15 +0800 |
| Frozen by | Devin (AI), before the email classifier, the sender check or any evaluation existed |

Rules (AGENTS rule 6):

- Never edit this file's rows. Any change breaks the hash above; verify with `sha256sum data/email_test/email_test.csv` (or `Get-FileHash -Algorithm SHA256` in PowerShell).
- Never tune a rule, weight or threshold on it, and never train on it (`training/train_email.py` does not read it).
- To get a new held-out email set, create `email_test_v2` and freeze it the same way.
