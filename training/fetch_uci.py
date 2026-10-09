"""Download the UCI SMS Spam Collection (CC BY 4.0) into data/raw/uci/.

Laptop-only helper for training. The app itself never makes network calls.
Dataset: Almeida, T. & Hidalgo, J. (2011). SMS Spam Collection. UCI Machine Learning Repository.
https://doi.org/10.24432/C5CC84
"""

import io
import urllib.request
import zipfile
from pathlib import Path

URL = "https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip"
OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "raw" / "uci"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(URL, timeout=60) as resp:
        data = resp.read()
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        zf.extract("SMSSpamCollection", OUT_DIR)
    print(f"Saved {OUT_DIR / 'SMSSpamCollection'}")


if __name__ == "__main__":
    main()
