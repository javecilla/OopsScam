# Evaluation: real Philippine messages, held out (2026-10-10)

868 real messages (255 scam, 613 legit): a fixed 20% split (seed 42, stratified) of the deduplicated PH Spam + Marketing SMS and Tagalog-SMS datasets. The texts stay in gitignored `data/raw/`; only these metrics are committed.

The classifier used here was trained without these 868 messages (same data and C=8 as the shipped model otherwise). The app's own `analyze()` (rules + classifier fusion) produced the verdicts. Caveats: the held-out messages come from the same inboxes as the training messages, so the numbers are somewhat optimistic; C was chosen partly on this split.

| Model | Recall | Precision | False-alarm rate | Legit shown as Scam |
| --- | --- | --- | --- | --- |
| Previous model (UCI + team data, commit ff12dc3) | 78.4% | 35.7% | 58.7% | 6.2% |
| New model (team + PH Spam + Tagalog-SMS + Mishra & Soni, no UCI) | 94.1% | 86.6% | 6.0% | 0.8% |
| Rules only | 15.7% | 48.2% | 7.0% | 2.1% |

"Flagged" = Suspicious or Scam. Reproduce: `python training/train.py` prints the classifier-only version of this check ("real dev").
