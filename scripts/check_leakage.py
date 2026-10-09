"""Fail if any message appears in more than one data group; report near-duplicates and train balance.

Groups: train, dev, test (original frozen set, if present), test_v2, adversarial, llm_eval.
Text is normalized first: lowercase, digits -> 0, whitespace collapsed.

Run from the repo root (standard library only):
    python scripts/check_leakage.py
Exit code 1 = leakage found.
"""

import csv
import json
import re
import sys
from collections import defaultdict
from itertools import combinations
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
NEAR_DUP_THRESHOLD = 0.8  # Jaccard similarity of character 4-grams

GROUPS = {
    "train": ["train/*.csv"],
    "dev": ["dev/*.csv"],
    "test": ["test/*.csv"],
    "test_v2": ["test_v2/*.csv"],
    "adversarial": ["adversarial/*.csv"],
    "llm_eval": ["llm_eval/*.jsonl"],
}


def normalize(text: str) -> str:
    text = re.sub(r"[0-9]", "0", text.lower())
    return re.sub(r"\s+", " ", text).strip()


def load(pattern: str):
    for path in sorted(DATA.glob(pattern)):
        if path.suffix == ".jsonl":
            for i, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
                if line.strip():
                    rec = json.loads(line)
                    yield path, rec.get("id", f"line{i}"), rec["message"], None
        else:
            with open(path, encoding="utf-8", newline="") as f:
                for i, r in enumerate(csv.DictReader(f), 1):
                    yield path, r.get("id") or f"row{i}", r["text"], r.get("label")


def grams(text: str) -> set:
    return {text[i : i + 4] for i in range(max(1, len(text) - 3))}


def main() -> int:
    items = []  # (group, id, normalized text, label)
    for group, patterns in GROUPS.items():
        for p in patterns:
            for path, rid, text, label in load(p):
                items.append((group, f"{path.relative_to(DATA).as_posix()}:{rid}", normalize(text), label))

    counts = defaultdict(int)
    for g, *_ in items:
        counts[g] += 1
    print("Messages per group:", dict(counts))

    # Exact duplicates after normalization.
    by_text = defaultdict(list)
    for g, rid, t, _ in items:
        by_text[t].append((g, rid))
    leaks, within = [], []
    for t, refs in by_text.items():
        groups = {g for g, _ in refs}
        if len(groups) > 1:
            leaks.append((t, refs))
        elif len(refs) > 1:
            within.append((t, refs))

    # Near-duplicates across groups.
    shingles = [(g, rid, grams(t)) for g, rid, t, _ in items]
    near = []
    for (g1, r1, s1), (g2, r2, s2) in combinations(shingles, 2):
        if g1 == g2:
            continue
        sim = len(s1 & s2) / len(s1 | s2)
        if NEAR_DUP_THRESHOLD <= sim < 1.0:
            near.append((round(sim, 2), r1, r2))

    # Class balance in train.
    train_labels = [lab for g, _, _, lab in items if g == "train"]
    scam = sum(1 for lab in train_labels if lab == "scam")
    share = scam / len(train_labels) if train_labels else 0
    print(f"Train balance: {scam} scam / {len(train_labels) - scam} legit ({share:.0%} scam)")
    balance_ok = 0.4 <= share <= 0.6

    if within:
        print(f"\nWARNING: {len(within)} duplicate text(s) inside a single group:")
        for t, refs in within:
            print("  ", [r for _, r in refs])
    if near:
        print(f"\nNear-duplicates across groups (similarity >= {NEAR_DUP_THRESHOLD}): {len(near)}")
        for sim, r1, r2 in sorted(near, reverse=True):
            print(f"   {sim}  {r1}  <->  {r2}")
    else:
        print(f"\nNo near-duplicates across groups (similarity >= {NEAR_DUP_THRESHOLD}).")
    if not balance_ok:
        print("\nFAIL: train class balance is outside 40/60.")
    if leaks:
        print(f"\nFAIL: {len(leaks)} message(s) appear in more than one group:")
        for t, refs in leaks:
            print("  ", [r for _, r in refs], "|", t[:80])
        return 1
    print("\nPASS: no message appears in more than one group.")
    return 0 if balance_ok else 1


if __name__ == "__main__":
    sys.exit(main())
