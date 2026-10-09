"""Measure Qwen-generated classifications; never use the legacy ML classifier.

Metrics distinguish Scam, Suspicious and Low risk. 'Flagged' means Scam or
Suspicious, so its recall is not a phishing-only recall claim. JSON grammar
constrains output shape, not the model's choice of label.
"""

import json
import time
from pathlib import Path
from typing import TypedDict

from peft import PeftModel
from transformers import PreTrainedTokenizerBase, Qwen3ForCausalLM

from data import Message, Verdict, fingerprint
from runtime import VERDICTS, predict


class ClassMetrics(TypedDict):
    precision: float | None
    recall: float | None
    f1: float | None


class Prediction(TypedDict):
    fingerprint: str
    expected: Verdict
    predicted: Verdict
    seconds: float


class Latency(TypedDict):
    mean: float
    worst: float


class EvaluationReport(TypedDict):
    model_kind: str
    n: int
    accuracy: float
    macro_f1: float
    flagged_recall: float | None
    scam_flagged_recall: float | None
    flagged_precision: float | None
    false_alarm_rate: float | None
    confusion: dict[Verdict, dict[Verdict, int]]
    per_class: dict[Verdict, ClassMetrics]
    latency_seconds: Latency
    predictions: list[Prediction]
    limitations: list[str]


def ratio(numerator: int, denominator: int) -> float | None:
    return numerator / denominator if denominator else None


def evaluate(model: Qwen3ForCausalLM | PeftModel, tokenizer: PreTrainedTokenizerBase,
             rows: list[Message], output: Path) -> EvaluationReport:
    confusion: dict[Verdict, dict[Verdict, int]] = {
        truth: {predicted: 0 for predicted in VERDICTS} for truth in VERDICTS
    }
    timings: list[float] = []
    predictions: list[Prediction] = []
    for index, row in enumerate(rows, 1):
        started = time.perf_counter()
        prediction = predict(model, tokenizer, row.text)
        elapsed = time.perf_counter() - started
        timings.append(elapsed)
        confusion[row.verdict][prediction] += 1
        predictions.append({"fingerprint": fingerprint(row.text), "expected": row.verdict,
                            "predicted": prediction, "seconds": elapsed})
        if index % 25 == 0 or index == len(rows):
            print(json.dumps({"stage": "evaluation", "completed": index, "total": len(rows),
                              "elapsed_seconds": sum(timings)}), flush=True)
    low_risk_total = sum(confusion["low_risk"].values())
    positives = sum(sum(confusion[verdict].values()) for verdict in ("scam", "suspicious"))
    true_positive = sum(confusion[truth][prediction] for truth in ("scam", "suspicious")
                        for prediction in ("scam", "suspicious"))
    false_positive = confusion["low_risk"]["scam"] + confusion["low_risk"]["suspicious"]
    per_class: dict[Verdict, ClassMetrics] = {}
    for verdict in VERDICTS:
        total = sum(confusion[verdict].values())
        predicted_total = sum(confusion[truth][verdict] for truth in VERDICTS)
        correct = confusion[verdict][verdict]
        per_class[verdict] = {"precision": ratio(correct, predicted_total),
                              "recall": ratio(correct, total),
                              "f1": ratio(2 * correct, total + predicted_total)}
    f1_values = [metrics["f1"] for metrics in per_class.values()]
    if any(value is None for value in f1_values):
        raise ValueError("Evaluation must represent every class before calculating macro F1")
    report: EvaluationReport = {"model_kind": "Qwen3 causal language model", "n": len(rows),
              "accuracy": sum(confusion[verdict][verdict] for verdict in VERDICTS) / len(rows),
              "macro_f1": sum(value for value in f1_values if value is not None) / len(VERDICTS),
              "flagged_recall": ratio(true_positive, positives),
              "scam_flagged_recall": ratio(confusion["scam"]["scam"] + confusion["scam"]["suspicious"],
                                            sum(confusion["scam"].values())),
              "flagged_precision": ratio(true_positive, true_positive + false_positive),
              "false_alarm_rate": ratio(false_positive, low_risk_total),
              "confusion": confusion, "per_class": per_class,
              "latency_seconds": {"mean": sum(timings) / len(timings), "worst": max(timings)},
              "predictions": predictions,
              "limitations": ["Laptop inference timing is not phone timing",
                               "Same-inbox holdout; not a cross-inbox real-world benchmark",
                               "Spam targets Suspicious rather than proven fraud"]}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report
