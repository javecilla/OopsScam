"""Measure real CPU LoRA updates before committing to a full training run.

Run: training/.qwen-venv/Scripts/python training/qwen/benchmark.py
The measured adapter is discarded; this is throughput evidence, not a trained
production checkpoint or an accuracy benchmark.
"""

import json
import statistics
import time
from pathlib import Path

import psutil
import torch

from runtime import ARTIFACTS, load_base_model, load_rows
from training import attach_adapter, classification_loss, example_tokens, load_config, select_training_rows


def main() -> None:
    config = load_config(Path(__file__).resolve().parent / "config.json")
    torch.set_num_threads(config.threads)
    torch.manual_seed(config.seed)
    rows = select_training_rows(load_rows(ARTIFACTS / "data/train.jsonl"), config)
    print(json.dumps({"stage": "loading_base", "available_memory_bytes": psutil.virtual_memory().available,
                      "cuda_available": torch.cuda.is_available()}), flush=True)
    base, tokenizer = load_base_model()
    model = attach_adapter(base, config)
    model.train()
    optimizer = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad],
                                 lr=config.learning_rate)
    measurements: list[float] = []
    for index, message in enumerate(rows[:8], 1):
        tokens, answer_count = example_tokens(tokenizer, message, config.max_tokens)
        started = time.perf_counter()
        optimizer.zero_grad(set_to_none=True)
        loss = classification_loss(model, tokens, answer_count)
        if not torch.isfinite(loss).item():
            raise FloatingPointError(f"Non-finite Qwen benchmark loss at sample {index}")
        loss.backward()
        optimizer.step()
        elapsed = time.perf_counter() - started
        measurements.append(elapsed)
        print(json.dumps({"sample": index, "tokens": tokens.shape[1],
                          "seconds": elapsed, "loss": loss.item(),
                          "process_memory_bytes": psutil.Process().memory_info().rss}), flush=True)
    median = statistics.median(measurements[1:])
    report = {"benchmark": "CPU LoRA classification update", "samples": len(measurements),
              "seconds": measurements, "median_seconds_excluding_warmup": median,
              "selected_training_rows": len(rows), "epochs": config.epochs,
              "estimated_training_hours": median * len(rows) * config.epochs / 3600,
              "estimate_excludes": ["checkpoint writes", "evaluation", "GGUF conversion", "phone tests"],
              "torch": torch.__version__, "threads": config.threads,
              "trainable_parameters": sum(p.numel() for p in model.parameters() if p.requires_grad),
              "process_memory_bytes": psutil.Process().memory_info().rss}
    (ARTIFACTS / "hardware_benchmark.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2), flush=True)


if __name__ == "__main__":
    main()
