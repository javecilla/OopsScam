"""Generate QR test images (T14) into data/images/qr/ with manifest.csv.

Official links come only from verified entries in src/core/brands.json. Fake malicious links use the
reserved .example domain, so no QR here points at a real scam site.

Run from the repo root (laptop only):
    pip install -r scripts/requirements.txt
    python scripts/make_qr_codes.py
"""

import csv
import json
from pathlib import Path

import qrcode

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "images" / "qr"

# expected: what a correct checker should say ("flagged" = Suspicious or Scam).
FAKE = [
    ("lookalike_gcash", "https://gcash-login-verify.example/qr", "lookalike", "flagged"),
    ("lookalike_bdo", "https://bdo-online-secure.example/login", "lookalike", "flagged"),
    ("lookalike_maya", "https://maya-pay-merchant.example/p/1", "lookalike", "flagged"),
    ("apk_gcash", "https://gcash-update.example/gcash.apk", "apk", "flagged"),
    ("apk_bank", "https://app-download.example/bank-secure.apk", "apk", "flagged"),
    ("text_scam", "Congratulations! Text your MPIN to 09XX-XXX-XXXX to claim P5,000.", "plain_text", "flagged"),
    ("text_store", "Juan Dela Cruz Sari-Sari Store - salamat sa pagbili!", "plain_text", "low_risk"),
    ("text_wifi", "WIFI:T:WPA;S:Cafe Guest;P:kape-2026;;", "plain_text", "low_risk"),
]
OFFICIAL_IDS = ["gcash", "bpi", "phlpost", "lazada"]


def main():
    brands = {b["id"]: b for b in json.loads((ROOT / "src/core/brands.json").read_text("utf-8"))["brands"]}
    items = []
    for bid in OFFICIAL_IDS:
        b = brands[bid]
        if not b["verified"]:
            continue  # never encode an unverified domain as "official"
        items.append((f"official_{bid}", f"https://{b['domains'][0]}", "official_verified", "low_risk"))
    items += FAKE

    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    for name, content, kind, expected in items:
        qrcode.make(content, box_size=10, border=4).save(OUT / f"{name}.png")
        rows.append({"file": f"{name}.png", "content": content, "kind": kind, "expected": expected})
    with open(OUT / "manifest.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["file", "content", "kind", "expected"],
                           quoting=csv.QUOTE_ALL, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)
    print(f"Wrote {len(rows)} QR codes to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
