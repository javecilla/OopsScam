"""Train the scam classifier and export it for on-device scoring in TypeScript (T9).

Run from the repo root:
    training/.venv/Scripts/python training/train.py     (Windows)
    training/.venv/bin/python training/train.py         (macOS/Linux)

Inputs (labels: scam or legit):
    data/train/*.csv           team-written messages, columns text,label,...
    data/raw/uci/SMSSpamCollection   UCI SMS Spam Collection (training/fetch_uci.py), optional
    data/raw/ph_spam/*.csv     PH Spam + Marketing SMS from Kaggle (manual download), optional
    data/dev/*.csv             dev set, optional; otherwise 20% of the training data is held out
data/test is never read here (AGENTS rule 6).

Outputs:
    assets/classifier.json     weights scored by src/ml/classifier.ts
    training/parity.json       sample messages + Python probabilities for the FR-ML-04 parity test
"""

import json
import re
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.sparse import hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent.parent
SEED = 42
TEAM_WEIGHT = 3.0  # team-written Taglish rows are few; weight them up against the English UCI rows
C_GRID = [0.5, 1.0, 2.0, 4.0, 8.0]

# FR-ML-02. These exact strings are exported, so TypeScript uses the same patterns.
# Only syntax that means the same in Python re and JavaScript RegExp (ASCII classes, \b, \S).
URL_PATTERN = (
    r"(?:https?://|www\.)\S+"
    r"|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|ph|xyz|top|click|online|site|live|link|shop"
    r"|info|io|co|me|app|icu|buzz|vip|cc|ly|gl|gy|id|at|tk)\b\S*"
)
NUM_PATTERN = r"[0-9]+"
_URL_RE = re.compile(URL_PATTERN)
_NUM_RE = re.compile(NUM_PATTERN)

WORD_PARAMS = dict(ngram_range=(1, 2), min_df=2, max_features=3000)
CHAR_PARAMS = dict(ngram_range=(3, 5), min_df=2, max_features=5000)

# Edge cases for the parity test: emoji, accents, extra spaces, tokens shorter than the n-gram size.
PARITY_EXTRAS = [
    "",
    "😀 congrats!!  you   won ₱5,000 ñ señor  a b c",
    "GCASH: I-VERIFY https://gcash-verify.xyz/login?id=12345 ngayon din!!!",
    "ok",
]


def normalize(text: str) -> str:
    text = text.lower()
    text = _URL_RE.sub(" url ", text)
    return _NUM_RE.sub(" num ", text)


def make_vectorizers():
    word = TfidfVectorizer(
        analyzer="word", lowercase=False, token_pattern=r"(?u)\b\w\w+\b",
        sublinear_tf=True, **WORD_PARAMS,
    )
    char = TfidfVectorizer(analyzer="char_wb", lowercase=False, sublinear_tf=True, **CHAR_PARAMS)
    return word, char


def map_label(value) -> str | None:
    v = str(value).strip().lower()
    if v in {"scam", "spam", "smishing", "fraud", "phishing"}:
        return "scam"
    if v in {"legit", "ham", "marketing", "promo", "promotional", "normal"}:
        return "legit"
    return None


def load_csv_dir(path: Path, source: str) -> pd.DataFrame:
    frames = []
    for f in sorted(path.glob("*.csv")):
        df = pd.read_csv(f)
        cols = {c.lower(): c for c in df.columns}
        text_col = next((cols[c] for c in ("text", "message", "sms", "content") if c in cols), None)
        label_col = next((cols[c] for c in ("label", "category", "type", "class") if c in cols), None)
        if text_col is None or label_col is None:
            print(f"  skip {f}: no text/label columns")
            continue
        frames.append(pd.DataFrame({
            "text": df[text_col].astype(str),
            "label": df[label_col].map(map_label),
            "source": source,
        }))
    if not frames:
        return pd.DataFrame(columns=["text", "label", "source"])
    return pd.concat(frames).dropna(subset=["label"])


def load_uci() -> pd.DataFrame:
    f = ROOT / "data" / "raw" / "uci" / "SMSSpamCollection"
    if not f.exists():
        print("  UCI not found (run training/fetch_uci.py); skipping")
        return pd.DataFrame(columns=["text", "label", "source"])
    df = pd.read_csv(f, sep="\t", header=None, names=["label", "text"], quoting=3)
    return pd.DataFrame({"text": df["text"], "label": df["label"].map(map_label), "source": "uci"})


def fit(texts, labels, weights, C):
    word, char = make_vectorizers()
    norm = [normalize(t) for t in texts]
    X = hstack([word.fit_transform(norm), char.fit_transform(norm)]).tocsr()
    clf = LogisticRegression(C=C, class_weight="balanced", max_iter=5000)
    clf.fit(X, labels, sample_weight=weights)
    return word, char, clf


def predict(model, texts):
    word, char, clf = model
    norm = [normalize(t) for t in texts]
    X = hstack([word.transform(norm), char.transform(norm)]).tocsr()
    scam_col = list(clf.classes_).index("scam")
    return clf.predict_proba(X)[:, scam_col]


def report(name, y_true, prob):
    y_pred = np.where(prob >= 0.5, "scam", "legit")
    p = precision_score(y_true, y_pred, pos_label="scam", zero_division=0)
    r = recall_score(y_true, y_pred, pos_label="scam", zero_division=0)
    f = f1_score(y_true, y_pred, pos_label="scam", zero_division=0)
    print(f"  {name}: precision {p:.3f}  recall {r:.3f}  F1 {f:.3f}  (n={len(y_true)})")
    return f


def export(model, path: Path):
    word, char, clf = model
    coef = clf.coef_[0]
    sign = 1.0 if list(clf.classes_).index("scam") == 1 else -1.0
    n_word = len(word.vocabulary_)

    def block(vec, offset):
        return {
            term: [round(float(vec.idf_[i]), 6), round(float(sign * coef[offset + i]), 6)]
            for term, i in sorted(vec.vocabulary_.items(), key=lambda kv: kv[1])
        }

    data = {
        "version": 1,
        "normalize": {"url": URL_PATTERN, "num": NUM_PATTERN},
        "word": {"ngram": list(WORD_PARAMS["ngram_range"]), "terms": block(word, 0)},
        "char": {"ngram": list(CHAR_PARAMS["ngram_range"]), "terms": block(char, n_word)},
        "intercept": round(float(sign * clf.intercept_[0]), 6),
    }
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {path.relative_to(ROOT)} ({path.stat().st_size / 1024:.0f} KB)")


def main():
    print("Loading data")
    team = load_csv_dir(ROOT / "data" / "train", "team")
    data = pd.concat([team, load_uci(), load_csv_dir(ROOT / "data" / "raw" / "ph_spam", "ph_spam")])
    data = data.drop_duplicates(subset=["text"]).reset_index(drop=True)
    for src, grp in data.groupby("source"):
        print(f"  {src}: {len(grp)} rows ({(grp.label == 'scam').sum()} scam)")

    dev = load_csv_dir(ROOT / "data" / "dev", "dev")
    if len(dev) > 0:
        train = data
    else:
        print("  no data/dev; holding out 20% (stratified by label and source)")
        strata = data["label"] + "_" + data["source"]
        train, dev = train_test_split(data, test_size=0.2, random_state=SEED, stratify=strata)

    weights = np.where(train["source"] == "team", TEAM_WEIGHT, 1.0)
    print("Choosing C on dev")
    best_c, best_f1 = None, -1.0
    for C in C_GRID:
        model = fit(train["text"].tolist(), train["label"].tolist(), weights, C)
        f = report(f"C={C}", dev["label"].to_numpy(), predict(model, dev["text"].tolist()))
        if f > best_f1:
            best_c, best_f1 = C, f

    print(f"Best C={best_c}. Dev results:")
    model = fit(train["text"].tolist(), train["label"].tolist(), weights, best_c)
    dev_prob = predict(model, dev["text"].tolist())
    report("all dev", dev["label"].to_numpy(), dev_prob)
    team_dev = (dev["source"] == "team").to_numpy()
    if team_dev.any():
        report("team dev", dev["label"].to_numpy()[team_dev], dev_prob[team_dev])

    print("Refitting on train + dev")
    full = pd.concat([train, dev])
    full_weights = np.where(full["source"] == "team", TEAM_WEIGHT, 1.0)
    model = fit(full["text"].tolist(), full["label"].tolist(), full_weights, best_c)
    export(model, ROOT / "assets" / "classifier.json")

    # Parity samples: dev messages (team-written first) plus edge cases.
    dev_sorted = dev.sort_values("source", key=lambda s: s != "team")
    samples = dev_sorted["text"].head(20).tolist() + PARITY_EXTRAS
    parity = [{"text": t, "p": float(p)} for t, p in zip(samples, predict(model, samples))]
    out = ROOT / "training" / "parity.json"
    out.write_text(json.dumps(parity, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Wrote {out.relative_to(ROOT)} ({len(parity)} samples)")


if __name__ == "__main__":
    main()
