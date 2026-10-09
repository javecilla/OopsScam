"""Validate the chosen fine-tuned Qwen adapter on untouched validation data.

Run: training/.qwen-venv/Scripts/python training/qwen/evaluate_adapter.py
No validation messages are used to update model weights or select an epoch.
"""

import json
from dataclasses import asdict

import torch
from peft import PeftModel

from evaluation import evaluate
from export import check_training_integrity, file_sha256, selected_run
from runtime import ARTIFACTS, load_base_model, load_rows


def main() -> None:
    torch.set_num_threads(6)
    run = selected_run()
    integrity = check_training_integrity(run)
    if (run / "validation.json").exists():
        raise FileExistsError(f"Held-out Qwen validation already exists; do not retune or overwrite it: {run}")
    base, tokenizer = load_base_model()
    model = PeftModel.from_pretrained(base, run / "best", is_trainable=False)
    report = evaluate(model, tokenizer, load_rows(ARTIFACTS / "data/validation.jsonl"),
                      run / "validation.json")
    if check_training_integrity(run) != integrity:
        raise RuntimeError(f"Qwen training inputs or adapter changed during validation: {run}")
    provenance = {**asdict(integrity), "report_sha256": file_sha256(run / "validation.json")}
    (run / "validation-provenance.json").write_text(json.dumps(provenance, indent=2) + "\n", encoding="utf-8")
    print({key: value for key, value in report.items() if key != "predictions"})


if __name__ == "__main__":
    main()
