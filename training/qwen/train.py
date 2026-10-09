"""Fine-tune Qwen itself on classification labels using a reproducible LoRA run.

Run: training/.qwen-venv/Scripts/python training/qwen/train.py
The balanced subset and every epoch are recorded. The tuning split selects the
best adapter; validation and frozen test data never contribute to fitting.
Each invocation creates a new run, so it does not overwrite previous work.
"""

import hashlib
import json
import random
import time
from collections import Counter
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

import torch

from data import fingerprint
from evaluation import evaluate
from runtime import ARTIFACTS, VERDICTS, load_base_model, load_rows
from training import (
    attach_adapter, classification_loss, example_tokens, load_config,
    select_training_rows, select_tuning_rows,
)


def main() -> None:
    config_path = Path(__file__).resolve().parent / "config.json"
    config = load_config(config_path)
    torch.set_num_threads(config.threads)
    torch.manual_seed(config.seed)
    rows = select_training_rows(load_rows(ARTIFACTS / "data/train.jsonl"), config)
    tune = load_rows(ARTIFACTS / "data/tune.jsonl")
    # A fixed small tuning subset limits CPU evaluation cost; final validation is separate.
    tune_sample = select_tuning_rows(tune)
    run = ARTIFACTS / "runs" / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run.mkdir(parents=True, exist_ok=False)
    metadata = {"status": "training", "configuration": asdict(config),
                "base": json.loads((ARTIFACTS / "base_revision.json").read_text(encoding="utf-8")),
                "data_manifest_sha256": hashlib.sha256((ARTIFACTS / "data/manifest.json").read_bytes()).hexdigest(),
                "training_distribution": dict(Counter(row.verdict for row in rows)),
                "training_fingerprints": [fingerprint(row.text) for row in rows],
                "tuning_rows": len(tune_sample),
                "tuning_fingerprints": [fingerprint(row.text) for row in tune_sample],
                "prompt_sha256": hashlib.sha256((Path(__file__).resolve().parents[2]
                                                 / "src/llm/classification-prompt.json").read_bytes()).hexdigest(),
                "epoch_reports": []}
    (run / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"run": str(run), "selected_rows": len(rows), "epochs": config.epochs}), flush=True)
    base, tokenizer = load_base_model()
    encoded = [example_tokens(tokenizer, row, config.max_tokens) for row in rows]
    model = attach_adapter(base, config)
    optimizer = torch.optim.AdamW([parameter for parameter in model.parameters() if parameter.requires_grad],
                                 lr=config.learning_rate)
    best_f1 = -1.0
    started = time.perf_counter()
    with (run / "training.jsonl").open("w", encoding="utf-8", buffering=1) as log:
        for epoch in range(1, config.epochs + 1):
            model.train()
            order = list(range(len(encoded)))
            random.Random(config.seed + epoch).shuffle(order)
            optimizer.zero_grad(set_to_none=True)
            for index, row_index in enumerate(order, 1):
                tokens, answer_count = encoded[row_index]
                sample_started = time.perf_counter()
                loss = classification_loss(model, tokens, answer_count)
                if not torch.isfinite(loss).item():
                    raise FloatingPointError(f"Non-finite Qwen loss: epoch={epoch}, sample={index}")
                accumulation_start = ((index - 1) // config.gradient_accumulation) * config.gradient_accumulation
                accumulation_size = min(config.gradient_accumulation, len(order) - accumulation_start)
                (loss / accumulation_size).backward()
                if index % config.gradient_accumulation == 0 or index == len(order):
                    torch.nn.utils.clip_grad_norm_([p for p in model.parameters() if p.requires_grad], 1.0)
                    optimizer.step()
                    optimizer.zero_grad(set_to_none=True)
                record = {"epoch": epoch, "sample": index, "total": len(order), "loss": loss.item(),
                          "seconds": time.perf_counter() - sample_started,
                          "elapsed_seconds": time.perf_counter() - started}
                log.write(json.dumps(record) + "\n")
                if index % 16 == 0 or index == len(order):
                    model.save_pretrained(run / "latest", safe_serialization=True)
                    print(json.dumps(record), flush=True)
            model.save_pretrained(run / f"epoch-{epoch}", safe_serialization=True)
            report = evaluate(model, tokenizer, tune_sample, run / f"epoch-{epoch}-tune.json")
            macro_f1 = report["macro_f1"]
            if not isinstance(macro_f1, float):
                raise TypeError("Qwen tuning report has no numeric macro F1")
            metadata["epoch_reports"].append({"epoch": epoch, "macro_f1": macro_f1})
            if macro_f1 > best_f1:
                best_f1 = macro_f1
                model.save_pretrained(run / "best", safe_serialization=True)
                tokenizer.save_pretrained(run / "best")
            (run / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    metadata["status"] = "trained_not_validated"
    metadata["training_seconds"] = time.perf_counter() - started
    metadata["best_tuning_macro_f1"] = best_f1
    (run / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    (ARTIFACTS / "selected_run.json").write_text(json.dumps({"run": str(run)}, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": metadata["status"], "run": str(run), "best_tuning_macro_f1": best_f1}), flush=True)


if __name__ == "__main__":
    main()
