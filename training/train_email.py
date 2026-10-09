"""Train the email scam classifier and export it for on-device scoring in TypeScript.

The app uses it instead of the SMS model when the input looks like an email (src/core/email.ts).
Same features, normalisation and export format as the SMS model (training/train.py); only the data differs.

Run from the repo root:
    training/.venv/Scripts/python training/train_email.py     (Windows)
    training/.venv/bin/python training/train_email.py         (macOS/Linux)

Inputs (labels: scam or legit):
    data/raw/kd_email/*.csv    Phishing and Legitimate Emails Dataset for ML 2026 (Kuladeep P, Kaggle,
                               CC BY-SA 4.0): LLM-generated English emails, label 1 = phishing, 0 = legitimate
    data/train_email/*.csv     our fictional Philippine emails (banks, e-wallets, deliveries, government)
    the SMS training data      everything train.py loads, so PH notifications, OTPs and promos stay "legit"
    data/dev/*.csv             added in the final refit only, as in train.py
data/email_test is never read here (AGENTS rule 6).

Outputs:
    assets/classifier_email.json   weights scored by src/ml/classifier.ts (CC BY-SA 4.0, see README)
    training/parity_email.json     sample emails + Python probabilities for the parity test
"""

import json
import re

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

import train as T

KD_DIR = T.ROOT / "data" / "raw" / "kd_email"

# The KD file gives its labels away through layout: only legit rows start with a "Subject:" line, only phishing
# rows have a "Keywords:" line, and every row ends in a generated sign-off. Strip all three in memory (the file
# stays unmodified) so the model learns the message, not the layout. 10,000 rows leave 2,636 unique texts.
_SUBJECT_RE = re.compile(r"^Subject:[^\n]*\n+")
_KEYWORDS_RE = re.compile(r"\n*Keywords:[^\n]*\n*")
_SIGNOFF_RE = re.compile(r"\n\n[^\n]{1,40},\n[^\n]{1,40}\s*$")


def clean_kd(text: str) -> str:
    text = _SUBJECT_RE.sub("", text)
    text = _KEYWORDS_RE.sub("\n\n", text)
    return _SIGNOFF_RE.sub("", text).strip()


def load_kd() -> pd.DataFrame:
    frames = [
        pd.DataFrame({
            "text": df["text"].astype(str).map(clean_kd),
            "label": df["label"].map({1: "scam", 0: "legit"}),
            "source": "kd_email",
        })
        for df in (pd.read_csv(f) for f in sorted(KD_DIR.glob("*.csv")))
    ]
    if not frames:
        raise SystemExit(f"No CSV in {KD_DIR.relative_to(T.ROOT)}")
    return pd.concat(frames).dropna(subset=["label"])


def weights_for(df: pd.DataFrame) -> np.ndarray:
    return np.where(df["source"].isin(["team", "team_email"]), T.TEAM_WEIGHT, 1.0)


def main():
    print("Loading data")
    team = T.load_csv_dir(T.ROOT / "data" / "train", "team")
    team_email = T.load_csv_dir(T.ROOT / "data" / "train_email", "team_email")
    raw = [T.load_csv_dir(T.ROOT / "data" / "raw" / d, d) for d in T.RAW_DIRS]
    raw = [T.scrub_names(df) for df in raw if len(df) > 0]
    data = pd.concat([team, team_email, *raw, load_kd()])
    data = data.drop_duplicates(subset=["text"]).reset_index(drop=True)
    for src, grp in data.groupby("source"):
        print(f"  {src}: {len(grp)} rows ({(grp.label == 'scam').sum()} scam)")

    # Held out for choosing C: 20% of the KD emails and the same 20% of real PH messages as train.py.
    held = []
    for sources in (["kd_email"], T.REAL_DEV_SOURCES):
        part = data[data["source"].isin(sources)]
        held.append(train_test_split(part, test_size=0.2, random_state=T.SEED, stratify=part["label"])[1])
    kd_dev, real_dev = held
    train = data.drop(index=kd_dev.index.union(real_dev.index))

    print("Choosing C on held-out KD emails + real PH messages")
    best_c, best_f1 = None, -1.0
    for C in T.C_GRID:
        model = T.fit(train["text"].tolist(), train["label"].tolist(), weights_for(train), C)
        f = sum(
            T.report(f"C={C} {name}", d["label"].to_numpy(), T.predict(model, d["text"].tolist()))
            for name, d in (("KD dev", kd_dev), ("real PH dev", real_dev))
        ) / 2
        if f > best_f1:
            best_c, best_f1 = C, f
    print(f"Best C={best_c}")
    model = T.fit(train["text"].tolist(), train["label"].tolist(), weights_for(train), best_c)
    legit = real_dev["label"].to_numpy() == "legit"
    real_prob = T.predict(model, real_dev["text"].tolist())
    print(f"  real PH dev false-alarm rate (classifier only): {(real_prob[legit] >= 0.5).mean():.1%}")

    print("Refitting on all data (train + held-out + data/dev)")
    full = pd.concat([data, T.load_csv_dir(T.ROOT / "data" / "dev", "dev")])
    model = T.fit(full["text"].tolist(), full["label"].tolist(), weights_for(full), best_c)
    T.export(model, T.ROOT / "assets" / "classifier_email.json")

    # Parity samples: our emails first, then KD emails, plus the shared edge cases.
    samples = team_email["text"].head(12).tolist() + kd_dev["text"].head(8).tolist() + T.PARITY_EXTRAS
    parity = [{"text": t, "p": float(p)} for t, p in zip(samples, T.predict(model, samples))]
    out = T.ROOT / "training" / "parity_email.json"
    out.write_text(json.dumps(parity, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Wrote {out.relative_to(T.ROOT)} ({len(parity)} samples)")


if __name__ == "__main__":
    main()
