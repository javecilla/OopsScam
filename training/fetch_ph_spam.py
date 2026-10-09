"""Download the PH Spam + Marketing SMS dataset (CC BY 4.0) into data/raw/ph_spam/.

Laptop-only helper for training. The app itself never makes network calls.
Dataset: Scott Lee Chua (2022-2026). PH Spam + Marketing SMS.
License: Creative Commons Attribution 4.0 International (CC BY 4.0).
Source: https://github.com/scottleechua/data/tree/main/spam-and-marketing-sms
Mirror: https://www.kaggle.com/datasets/scottleechua/ph-spam-marketing-sms
"""

import csv
import io
import urllib.request
from pathlib import Path

URL = "https://raw.githubusercontent.com/scottleechua/data/main/spam-and-marketing-sms/text-messages.csv"
OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "raw" / "ph_spam"
OUT_FILE = OUT_DIR / "ph_spam_marketing.csv"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Downloading PH Spam SMS dataset from {URL}...")
    req = urllib.request.Request(URL, headers={"User-Agent": "OopsScam-Data-Fetcher"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        content = resp.read().decode("utf-8", errors="replace")

    reader = csv.DictReader(io.StringIO(content))
    rows = []
    scam_count = 0
    legit_count = 0

    for row in reader:
        text = (row.get("text") or "").strip()
        cat = (row.get("category") or "").strip().lower()
        if not text:
            continue

        # In train.py: 'scam' is positive class, 'legit' is negative class
        # spam -> scam; ads/notifs/gov/otp -> legit
        if cat == "spam":
            label = "scam"
            scam_count += 1
        elif cat in {"ads", "notifs", "gov", "otp"}:
            label = "legit"
            legit_count += 1
        else:
            continue

        rows.append({
            "text": text,
            "label": label,
            "category": cat,
            "sender": row.get("sender", ""),
            "date_received": row.get("date-received", ""),
        })

    with open(OUT_FILE, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["text", "label", "category", "sender", "date_received"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Saved {OUT_FILE} (total {len(rows)} messages: {scam_count} scam, {legit_count} legit)")


if __name__ == "__main__":
    main()
