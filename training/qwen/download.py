"""Download and pin the original Qwen checkpoint for laptop-only fine-tuning.

Run: training/.qwen-venv/Scripts/python training/qwen/download.py
No dataset text is sent to Hugging Face. The app never runs this helper.
"""

import json
import hashlib
import logging
import time
from pathlib import Path

from huggingface_hub import HfApi, get_hf_file_metadata, hf_hub_url, snapshot_download
import requests
from requests.exceptions import RequestException

ARTIFACTS = Path(__file__).resolve().parent / "artifacts"
REPO = "Qwen/Qwen3-0.6B"


def download_tokenizer(revision: str) -> None:
    """Use a bounded canonical HTTP transfer and verify the published LFS digest.

    The Hub's HEAD-resolved transfer stalled on this machine for tokenizer.json;
    the canonical GET returned the full file in seconds. This path always uses
    canonical GET rather than silently substituting an incomplete tokenizer.
    """
    url = hf_hub_url(REPO, "tokenizer.json", revision=revision)
    metadata = get_hf_file_metadata(url, token=False)
    expected = metadata.etag
    if not isinstance(expected, str) or len(expected) != 64:
        raise ValueError(f"Tokenizer metadata has no SHA-256 LFS digest: repo={REPO}, revision={revision}")
    response = requests.get(url, timeout=(10, 30))
    response.raise_for_status()
    content = response.content
    actual = hashlib.sha256(content).hexdigest()
    if actual != expected:
        raise ValueError(f"Tokenizer checksum mismatch: expected={expected}, actual={actual}, revision={revision}")
    parsed = json.loads(content)
    if not isinstance(parsed, dict) or "model" not in parsed:
        raise ValueError(f"Downloaded tokenizer is not a valid tokenizer definition: revision={revision}")
    (ARTIFACTS / "base/tokenizer.json").write_bytes(content)


def download_base() -> str:
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    revision_file = ARTIFACTS / "base_revision.json"
    for attempt in range(1, 4):
        try:
            if revision_file.exists():
                metadata = json.loads(revision_file.read_text(encoding="utf-8"))
                revision = metadata.get("revision")
                if metadata.get("repo") != REPO or not isinstance(revision, str):
                    raise ValueError(f"Invalid pinned model metadata: {revision_file}")
            else:
                revision = HfApi(token=False).model_info(REPO).sha
                if not isinstance(revision, str) or not revision:
                    raise ValueError(f"Hugging Face returned no revision for {REPO}")
                revision_file.write_text(json.dumps({"repo": REPO, "revision": revision}, indent=2)
                                         + "\n", encoding="utf-8")
            snapshot_download(repo_id=REPO, revision=revision,
                              local_dir=ARTIFACTS / "base", max_workers=1,
                              token=False, ignore_patterns=["tokenizer.json"],
                              allow_patterns=["*.json", "*.safetensors", "*.txt", "LICENSE*"])
            download_tokenizer(revision)
            return revision
        except RequestException:
            if attempt == 3:
                raise
            logging.warning("Model download failed; retrying", extra={"repo": REPO,
                            "attempt": attempt, "retry_seconds": attempt * 2}, exc_info=True)
            time.sleep(attempt * 2)
    raise RuntimeError(f"Model download exhausted retries: {REPO}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.WARNING)
    print(json.dumps({"repo": REPO, "revision": download_base()}, indent=2))
