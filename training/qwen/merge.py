"""Merge the selected, validated Qwen adapter into a standalone BF16 checkpoint.

Run: training/.qwen-venv/Scripts/python training/qwen/merge.py
Requires held-out validation to meet the existing 90% flagged-recall and 10%
false-alarm targets. Does not overwrite the app's existing pretrained GGUF.
"""

import json
from dataclasses import asdict

import torch
from peft import PeftModel

from export import check_training_integrity, file_sha256, selected_run, validated_metrics
from runtime import load_base_model


def main() -> None:
    run = selected_run()
    integrity = check_training_integrity(run)
    recall, false_alarm = validated_metrics(run, integrity)
    destination = run / "merged"
    if destination.exists():
        raise FileExistsError(f"Merged Qwen output already exists; refusing to overwrite: {destination}")
    torch.set_num_threads(6)
    base, tokenizer = load_base_model()
    adapter = PeftModel.from_pretrained(base, run / "best", is_trainable=False)
    merged = adapter.merge_and_unload(safe_merge=True)
    merged = merged.to(torch.bfloat16)
    merged.save_pretrained(destination, safe_serialization=True)
    tokenizer.save_pretrained(destination)
    if check_training_integrity(run) != integrity:
        raise RuntimeError(f"Qwen training inputs or adapter changed during merge: {run}")
    metadata = {"source_run": str(run), **asdict(integrity),
                "validation_sha256": file_sha256(run / "validation.json"),
                "weights_sha256": file_sha256(destination / "model.safetensors"),
                "precision": "BF16", "validation_recall": recall, "validation_false_alarm_rate": false_alarm}
    (destination / "oopsscam-provenance.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"merged": str(destination), **metadata}, indent=2))


if __name__ == "__main__":
    main()
