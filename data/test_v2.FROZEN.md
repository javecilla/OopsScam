# test_v2: FROZEN

| | |
| --- | --- |
| File | `data/test_v2/test_v2.csv` |
| Rows | 81 (41 scam, 40 legit) |
| SHA-256 | `739af670b217dc7bc6081b0eefd81cba78ec05995b91bb34631ad8819fcba3df` |
| Frozen at | 2026-10-09 23:10:21 +0800 |
| Frozen by | Claude Code (AI), before any evaluation was run on it |

Rules (AGENTS rule 6):

- Never edit this file's rows. Any change breaks the hash above; verify with `sha256sum data/test_v2/test_v2.csv` (or `Get-FileHash -Algorithm SHA256` in PowerShell).
- Never tune a rule, weight or threshold on it. Tune on `data/dev` only.
- To get a new held-out set, create `test_v3` and freeze it the same way.
