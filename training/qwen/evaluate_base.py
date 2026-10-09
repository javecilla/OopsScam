"""Evaluate the original Qwen checkpoint on tuning data before fine-tuning.

Run: training/.qwen-venv/Scripts/python training/qwen/evaluate_base.py
This baseline never trains a model and never reads frozen test messages.
"""

import torch

from evaluation import evaluate
from runtime import ARTIFACTS, load_base_model, load_rows
from training import select_tuning_rows


def main() -> None:
    torch.set_num_threads(6)
    model, tokenizer = load_base_model()
    report = evaluate(model, tokenizer, select_tuning_rows(load_rows(ARTIFACTS / "data/tune.jsonl")),
                      ARTIFACTS / "baseline-tune.json")
    print({key: value for key, value in report.items() if key != "predictions"})


if __name__ == "__main__":
    main()
