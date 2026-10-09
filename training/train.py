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
    r"|info|io|co|me|app|icu|buzz|vip|cc|ly|gl|gy|id|at|tk|example|test|invalid)\b\S*"
)
NUM_PATTERN = r"[0-9]+"
_URL_RE = re.compile(URL_PATTERN)
_NUM_RE = re.compile(NUM_PATTERN)

# Public datasets in data/raw/<dir> (gitignored), loaded if present. Licenses: data/sources.md.
RAW_DIRS = ["ph_spam", "tagalog_sms", "mishra_soni"]
REAL_DEV_SOURCES = ["ph_spam", "tagalog_sms"]
# UCI (2011 English spam, mostly marketing) made the model flag 65.6% of real PH legit texts in
# a 2026-10-10 comparison (2.6% without it). Kept loadable for comparison, off by default.
INCLUDE_UCI = False

# Name detection for scrub_names().
_NAME_AFTER_TITLE_RE = re.compile(r"\bMr/Ms\.?\s+(.+?)(?=\s+[A-Z]{3,}\b|[,.!]|$)")
_NAME_AFTER_GREETING_RE = re.compile(r"\b(?:Hi|Hello|Dear|Hey)\s*,?\s+([A-Z][a-zA-Z]{2,})\b")
_NOT_NAMES = {
    "mr", "ms", "mrs", "sir", "maam", "ma", "po", "there", "all", "everyone", "customer", "member",
    "valued", "kapamilya", "kabayan", "ka", "fam", "gomo", "epic", "tropa", "you", "and", "good",
    "smart", "globe", "tnt", "gcash", "maya", "bdo", "dito", "shopee", "lazada", "subscriber",
    "user", "friend", "guys", "team", "again", "welcome", "suki", "partner", "loyal", "your", "has",
    "mobile", "voucher",
}

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
    # PH Spam + Marketing SMS labels its legitimate messages ads / notifs / OTP / gov.
    if v in {"legit", "ham", "marketing", "promo", "promotional", "normal", "ads", "notifs", "otp", "gov"}:
        return "legit"
    return None


def load_csv_dir(path: Path, source: str) -> pd.DataFrame:
    frames = []
    for f in sorted([*path.glob("*.csv"), *path.glob("*.xlsx")]):
        if f.suffix == ".xlsx":
            df = pd.read_excel(f)
        else:
            # PH Spam + Marketing SMS has 2 malformed rows (two categories, no text); skip them.
            df = pd.read_csv(f, on_bad_lines="skip", encoding_errors="replace")
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
    out = pd.concat(frames).dropna(subset=["label"])
    # The dataset author replaced most notification/OTP texts with "<REDACTED>"; they carry no signal.
    return out[out["text"].str.strip() != "<REDACTED>"]


def scrub_names(df: pd.DataFrame) -> pd.DataFrame:
    """Replace people's names in public datasets with NAME, in memory only.

    Some datasets are a person's own inbox, and the exported weights keep n-grams seen in 2+
    messages, so a recurring name could otherwise end up in assets/classifier.json.
    Names are found after greetings, then every occurrence of those words is replaced.
    """
    names = set()
    for text in df["text"]:
        for m in _NAME_AFTER_TITLE_RE.finditer(text):
            names.update(w.lower() for w in m.group(1).split())
        for m in _NAME_AFTER_GREETING_RE.finditer(text):
            names.add(m.group(1).lower())
    names -= _NOT_NAMES
    if not names:
        return df
    word_re = re.compile(r"\b(?:" + "|".join(map(re.escape, sorted(names))) + r")\b", re.IGNORECASE)
    out = df.copy()
    out["text"] = out["text"].map(lambda s: word_re.sub("NAME", s))
    print(f"  scrubbed {len(names)} name word(s) in {df['source'].iloc[0]}")
    return out


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
    raw = [load_csv_dir(ROOT / "data" / "raw" / d, d) for d in RAW_DIRS]
    raw = [scrub_names(df) for df in raw if len(df) > 0]
    data = pd.concat([team, *([load_uci()] if INCLUDE_UCI else []), *raw])
    data = data.drop_duplicates(subset=["text"]).reset_index(drop=True)
    for src, grp in data.groupby("source"):
        print(f"  {src}: {len(grp)} rows ({(grp.label == 'scam').sum()} scam)")

    # Real-message check: hold out 20% of the real Philippine messages (never committed). Our
    # dev/test sets are AI-written and cannot show how the model does on real texts.
    real = data[data["source"].isin(REAL_DEV_SOURCES)]
    real_dev = pd.DataFrame(columns=data.columns)
    if len(real) > 0:
        _, real_dev = train_test_split(real, test_size=0.2, random_state=SEED, stratify=real["label"])
    data_wo_real_dev = data.drop(index=real_dev.index)

    dev = load_csv_dir(ROOT / "data" / "dev", "dev")
    if len(dev) > 0:
        train = data_wo_real_dev
    else:
        print("  no data/dev; holding out 20% (stratified by label and source)")
        strata = data_wo_real_dev["label"] + "_" + data_wo_real_dev["source"]
        train, dev = train_test_split(
            data_wo_real_dev, test_size=0.2, random_state=SEED, stratify=strata
        )

    weights = np.where(train["source"] == "team", TEAM_WEIGHT, 1.0)
    # Choose C on the average F1 of the synthetic dev set and the real held-out messages: the small
    # AI-written dev set alone is noisy and favors models that look like our own writing.
    print("Choosing C on dev" + (" + real dev" if len(real_dev) > 0 else ""))
    best_c, best_f1 = None, -1.0
    for C in C_GRID:
        model = fit(train["text"].tolist(), train["label"].tolist(), weights, C)
        f = report(f"C={C} dev", dev["label"].to_numpy(), predict(model, dev["text"].tolist()))
        if len(real_dev) > 0:
            real_f = report(
                f"C={C} real", real_dev["label"].to_numpy(), predict(model, real_dev["text"].tolist())
            )
            f = (f + real_f) / 2
        if f > best_f1:
            best_c, best_f1 = C, f

    print(f"Best C={best_c}. Dev results:")
    model = fit(train["text"].tolist(), train["label"].tolist(), weights, best_c)
    dev_prob = predict(model, dev["text"].tolist())
    report("all dev", dev["label"].to_numpy(), dev_prob)
    team_dev = (dev["source"] == "team").to_numpy()
    if team_dev.any():
        report("team dev", dev["label"].to_numpy()[team_dev], dev_prob[team_dev])
    if len(real_dev) > 0:
        print("Real held-out PH messages (same inboxes as training, so somewhat optimistic):")
        real_prob = predict(model, real_dev["text"].tolist())
        report("real dev", real_dev["label"].to_numpy(), real_prob)
        legit = real_dev["label"].to_numpy() == "legit"
        print(f"  real dev false-alarm rate: {(real_prob[legit] >= 0.5).mean():.1%}")

    print("Refitting on all data (train + dev + real held-out)")
    full = pd.concat([data, dev])
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
