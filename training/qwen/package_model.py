"""Package only a provenance-bound, fully evaluated fine-tuned Qwen GGUF.

Run: training/.qwen-venv/Scripts/python training/qwen/package_model.py <report.json>
This never trains, exports, overwrites models, or touches the original GGUF.
Failed copies remain unvalidated; inspect them before any deliberate cleanup.
"""

import argparse
import hashlib
import json
import math
import re
import shutil
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Literal, cast

from export import (
    ARTIFACTS, LLAMA_COMMIT, PROMPT_FILE, ROOT, TOOLS_ARCHIVE_SHA256,
    check_training_integrity, file_sha256, selected_run, validated_metrics,
)

Verdict = Literal["scam", "suspicious", "low_risk"]
VERDICTS: tuple[Verdict, ...] = ("scam", "suspicious", "low_risk")
MODEL_FILENAME = "OopsScam-Qwen3-0.6B-Q4_K_M.gguf"
ASSET_FILENAME = "Qwen_Qwen3-0.6B-Q4_K_M.gguf"
VALIDATION_COUNT = 973


@dataclass(frozen=True)
class Provenance:
    source_run: str
    model_sha256: str
    prompt_sha256: str
    validation_data_sha256: str
    data_manifest_sha256: str
    adapter_sha256: str
    selected_run_sha256: str
    metadata_sha256: str
    validation_report_sha256: str
    validation_provenance_sha256: str
    merged_provenance_sha256: str
    export_provenance_sha256: str


@dataclass(frozen=True)
class Prediction:
    fingerprint: str
    expected: Verdict
    qwen: Verdict
    final: Verdict
    classification_ms: float


@dataclass(frozen=True)
class ClassMetrics:
    precision: float | None
    recall: float
    f1: float


@dataclass(frozen=True)
class Metrics:
    accuracy: float
    flagged_precision: float | None
    flagged_recall: float
    scam_flagged_recall: float
    false_alarm_rate: float
    macro_f1: float
    per_class: dict[Verdict, ClassMetrics]
    confusion: dict[Verdict, dict[Verdict, int]]


@dataclass(frozen=True)
class Evaluation:
    qwen_only: Metrics
    qwen_with_rule_safeguards: Metrics
    mean_ms: float
    worst_ms: float


def read_object(value: object, context: str) -> dict[str, object]:
    """Validate untyped JSON only at the runtime boundary."""
    if not isinstance(value, dict) or not all(isinstance(key, str) for key in value):
        raise ValueError(f"Expected a JSON object: {context}")
    return cast(dict[str, object], value)


def unique_fields(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate JSON field: {key}")
        result[key] = value
    return result


def reject_constant(value: str) -> object:
    raise ValueError(f"Nonfinite JSON number is forbidden: {value}")


def parse_json(text: str, context: str) -> dict[str, object]:
    return read_object(json.loads(text, object_pairs_hook=unique_fields,
                                  parse_constant=reject_constant), context)


def load_object(path: Path) -> dict[str, object]:
    return parse_json(path.read_text(encoding="utf-8"), str(path))


def require_fields(value: object, expected: dict[str, str | int | float], context: str) -> None:
    fields = read_object(value, context)
    for field, actual in expected.items():
        if fields.get(field) != actual or isinstance(fields.get(field), bool):
            raise ValueError(f"Qwen provenance mismatch: field={field}, context={context}")


def finite_number(value: object, context: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"Expected a finite nonnegative number: {context}")
    number = float(value)
    if not math.isfinite(number) or number < 0:
        raise ValueError(f"Expected a finite nonnegative number: {context}")
    return number


def label(value: object, context: str) -> Verdict:
    if not isinstance(value, str) or value not in VERDICTS:
        raise ValueError(f"Invalid classification label: {context}")
    return cast(Verdict, value)


def fingerprint(text: str) -> str:
    normalized = re.sub(r"\s+", " ", re.sub(r"[0-9]", "0", text.lower())).strip()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def validation_labels() -> dict[str, Verdict]:
    path = ARTIFACTS / "data/validation.jsonl"
    result: dict[str, Verdict] = {}
    for index, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        row = parse_json(line, f"validation row {index}")
        text = row.get("text")
        if not isinstance(text, str) or not text.strip():
            raise ValueError(f"Missing validation message text: row={index}")
        digest = fingerprint(text)
        if digest in result:
            raise ValueError(f"Duplicate validation fingerprint: row={index}")
        result[digest] = label(row.get("verdict"), f"validation row {index}")
    if len(result) != VALIDATION_COUNT:
        raise ValueError(f"Expected full {VALIDATION_COUNT}-row validation; found {len(result)}")
    return result


def verify_graph(run: Path) -> Provenance:
    integrity = check_training_integrity(run)
    recall, false_alarm = validated_metrics(run, integrity)
    merged = run / "merged"
    merged_path = merged / "oopsscam-provenance.json"
    require_fields(load_object(merged_path), {
        **asdict(integrity), "source_run": str(run), "precision": "BF16",
        "validation_sha256": file_sha256(run / "validation.json"),
        "weights_sha256": file_sha256(merged / "model.safetensors"),
        "validation_recall": recall, "validation_false_alarm_rate": false_alarm,
    }, str(merged_path))
    model = run / "gguf" / MODEL_FILENAME
    size = model.stat().st_size
    with model.open("rb") as stream:
        if stream.read(4) != b"GGUF" or size < 100_000_000:
            raise ValueError(f"Quantized model is not a complete GGUF: {model}")
    model_sha = file_sha256(model)
    export_path = run / "gguf/provenance.json"
    require_fields(load_object(export_path), {
        **asdict(integrity), "status": "exported_not_gguf_validated", "source_run": str(run),
        "merged_provenance_sha256": file_sha256(merged_path),
        "llama_cpp_commit": LLAMA_COMMIT, "tools_archive_sha256": TOOLS_ARCHIVE_SHA256,
        "quantizer_sha256": file_sha256(ARTIFACTS / "tools/llama-quantize.exe"),
        "quantization": "Q4_K_M", "gguf_file": str(model.resolve(strict=True)),
        "gguf_sha256": model_sha, "gguf_bytes": size,
        "bf16_sha256": file_sha256(run / "gguf/OopsScam-Qwen3-0.6B-BF16.gguf"),
    }, str(export_path))
    return Provenance(
        source_run=str(run), model_sha256=model_sha, **asdict(integrity),
        selected_run_sha256=file_sha256(ARTIFACTS / "selected_run.json"),
        metadata_sha256=file_sha256(run / "metadata.json"),
        validation_report_sha256=file_sha256(run / "validation.json"),
        validation_provenance_sha256=file_sha256(run / "validation-provenance.json"),
        merged_provenance_sha256=file_sha256(merged_path),
        export_provenance_sha256=file_sha256(export_path),
    )


def predictions(value: object, expected: dict[str, Verdict]) -> tuple[Prediction, ...]:
    if not isinstance(value, list) or len(value) != VALIDATION_COUNT:
        raise ValueError(f"GGUF report must contain {VALIDATION_COUNT} predictions")
    result: list[Prediction] = []
    seen: set[str] = set()
    for index, item in enumerate(value, 1):
        row = read_object(item, f"prediction {index}")
        digest = row.get("fingerprint")
        if not isinstance(digest, str) or digest not in expected or digest in seen:
            raise ValueError(f"Duplicate, missing or unexpected prediction fingerprint: row={index}")
        truth = label(row.get("expected"), f"prediction {index} expected")
        if truth != expected[digest]:
            raise ValueError(f"Prediction expected label differs from validation data: row={index}")
        qwen = label(row.get("qwen"), f"prediction {index} qwen")
        final = label(row.get("final"), f"prediction {index} final")
        if VERDICTS.index(final) > VERDICTS.index(qwen):
            raise ValueError(f"Rule safeguards lowered the Qwen verdict: row={index}")
        timing = finite_number(row.get("classification_ms"), f"prediction {index} timing")
        seen.add(digest)
        result.append(Prediction(digest, truth, qwen, final, timing))
    if seen != set(expected):
        raise ValueError("GGUF predictions do not cover the complete current validation split")
    return tuple(result)


def confusion_metrics(confusion: dict[Verdict, dict[Verdict, int]]) -> Metrics:
    actual = {truth: sum(confusion[truth].values()) for truth in VERDICTS}
    predicted = {verdict: sum(confusion[truth][verdict] for truth in VERDICTS) for verdict in VERDICTS}
    if any(count == 0 for count in actual.values()):
        raise ValueError("GGUF evaluation must represent all three labels")
    per_class: dict[Verdict, ClassMetrics] = {
        verdict: ClassMetrics(
            confusion[verdict][verdict] / predicted[verdict] if predicted[verdict] else None,
            confusion[verdict][verdict] / actual[verdict],
            2 * confusion[verdict][verdict] / (actual[verdict] + predicted[verdict]),
        ) for verdict in VERDICTS
    }
    true_positive = sum(confusion[truth][verdict] for truth in ("scam", "suspicious")
                        for verdict in ("scam", "suspicious"))
    false_positive = confusion["low_risk"]["scam"] + confusion["low_risk"]["suspicious"]
    return Metrics(
        accuracy=sum(confusion[v][v] for v in VERDICTS) / sum(actual.values()),
        flagged_precision=true_positive / (true_positive + false_positive)
        if true_positive + false_positive else None,
        flagged_recall=true_positive / (actual["scam"] + actual["suspicious"]),
        scam_flagged_recall=(confusion["scam"]["scam"] + confusion["scam"]["suspicious"]) / actual["scam"],
        false_alarm_rate=false_positive / actual["low_risk"],
        macro_f1=sum(item.f1 for item in per_class.values()) / len(VERDICTS),
        per_class=per_class, confusion=confusion,
    )


def require_number_match(value: object, expected: float, context: str) -> None:
    if not math.isclose(finite_number(value, context), expected, rel_tol=1e-12, abs_tol=1e-9):
        raise ValueError(f"Reported number differs from actual predictions: {context}")


def require_metrics(value: object, actual: Metrics, context: str) -> None:
    row = read_object(value, context)
    for field in ("accuracy", "flagged_recall", "scam_flagged_recall", "false_alarm_rate", "macro_f1"):
        require_number_match(row.get(field), getattr(actual, field), f"{context}.{field}")
    if actual.flagged_precision is None:
        if row.get("flagged_precision") is not None or "flagged_precision" not in row:
            raise ValueError(f"Invalid flagged precision: {context}")
    else:
        require_number_match(row.get("flagged_precision"), actual.flagged_precision, f"{context}.flagged_precision")
    reported_confusion = read_object(row.get("confusion"), f"{context}.confusion")
    reported_classes = read_object(row.get("per_class"), f"{context}.per_class")
    for verdict in VERDICTS:
        counts = read_object(reported_confusion.get(verdict), f"{context}.confusion.{verdict}")
        for predicted in VERDICTS:
            count = counts.get(predicted)
            if type(count) is not int or count != actual.confusion[verdict][predicted]:
                raise ValueError(f"Confusion count differs from predictions: {context}.{verdict}.{predicted}")
        metrics = read_object(reported_classes.get(verdict), f"{context}.per_class.{verdict}")
        for field, expected in asdict(actual.per_class[verdict]).items():
            if expected is None:
                if metrics.get(field) is not None or field not in metrics:
                    raise ValueError(f"Invalid undefined metric: {context}.{verdict}.{field}")
            else:
                require_number_match(metrics.get(field), expected, f"{context}.{verdict}.{field}")
    if actual.flagged_recall < .90 or actual.scam_flagged_recall < .90 or actual.false_alarm_rate > .10:
        raise ValueError(f"GGUF acceptance targets failed: {context}; do not package")


def evaluate_report(report: object, provenance: Provenance) -> Evaluation:
    row = read_object(report, "GGUF report")
    require_fields(row, {**asdict(provenance), "validation_sha256": provenance.validation_data_sha256},
                   "GGUF report provenance")
    if type(row.get("n")) is not int or row["n"] != VALIDATION_COUNT:
        raise ValueError(f"GGUF report must evaluate all {VALIDATION_COUNT} validation rows")
    rows = predictions(row.get("predictions"), validation_labels())
    qwen: dict[Verdict, dict[Verdict, int]] = {
        truth: {verdict: sum(p.expected == truth and p.qwen == verdict for p in rows)
                for verdict in VERDICTS} for truth in VERDICTS
    }
    final: dict[Verdict, dict[Verdict, int]] = {
        truth: {verdict: sum(p.expected == truth and p.final == verdict for p in rows)
                for verdict in VERDICTS} for truth in VERDICTS
    }
    qwen_metrics = confusion_metrics(qwen)
    final_metrics = confusion_metrics(final)
    require_metrics(row.get("qwen_only"), qwen_metrics, "qwen_only")
    require_metrics(row.get("qwen_with_rule_safeguards"), final_metrics, "qwen_with_rule_safeguards")
    mean_ms = sum(p.classification_ms for p in rows) / len(rows)
    worst_ms = max(p.classification_ms for p in rows)
    latency = read_object(row.get("latency"), "latency")
    require_number_match(latency.get("mean_ms"), mean_ms, "latency.mean_ms")
    require_number_match(latency.get("worst_ms"), worst_ms, "latency.worst_ms")
    return Evaluation(qwen_metrics, final_metrics, mean_ms, worst_ms)


def file_md5(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "md5").hexdigest()


def package(report_path: Path) -> None:
    destination = ROOT / "models" / MODEL_FILENAME
    sidecar = destination.with_suffix(".json")
    for path in (destination, sidecar):
        if path.exists() or path.is_symlink():
            raise FileExistsError(f"Refusing to overwrite Qwen package output: {path}")
    if not (ARTIFACTS / "selected_run.json").is_file():
        raise FileNotFoundError("Qwen training has not completed and selected an adapter; no model was copied")
    run = selected_run()
    provenance = verify_graph(run)
    report_bytes = report_path.read_bytes()
    report_sha = hashlib.sha256(report_bytes).hexdigest()
    evaluation = evaluate_report(parse_json(report_bytes.decode("utf-8"), str(report_path)), provenance)
    prompt = load_object(PROMPT_FILE).get("system")
    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError(f"Missing classification system prompt: {PROMPT_FILE}")
    source = run / "gguf" / MODEL_FILENAME
    size = source.stat().st_size
    md5 = file_md5(source)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with source.open("rb") as origin, destination.open("xb") as output:
        shutil.copyfileobj(origin, output, length=1024 * 1024)
    if (destination.stat().st_size != size or file_sha256(destination) != provenance.model_sha256
            or file_md5(destination) != md5):
        raise RuntimeError(f"Copied Qwen model failed integrity verification; no manifest written: {destination}")
    if selected_run() != run or verify_graph(run) != provenance or file_sha256(report_path) != report_sha:
        raise RuntimeError("Qwen artifacts changed during packaging; copied model is unvalidated, no manifest written")
    manifest = {
        "status": "gguf_validated", "filename": MODEL_FILENAME, "asset_filename": ASSET_FILENAME,
        "bytes": size, "sha256": provenance.model_sha256, "md5": md5,
        "classification_system_prompt": prompt, **asdict(provenance),
        "report_sha256": report_sha, "report_file": str(report_path.resolve()),
        "validation_count": VALIDATION_COUNT, "quantization": "Q4_K_M",
        "llama_cpp_commit": LLAMA_COMMIT, "evaluation": asdict(evaluation),
        "limitations": ["Laptop validation does not establish phone latency or native APK correctness.",
                        "SMS source-derived labels do not certify email or all phishing scenarios."],
    }
    with sidecar.open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(manifest, indent=2, allow_nan=False) + "\n")
    print(json.dumps({"model": str(destination), "manifest": str(sidecar),
                      "sha256": provenance.model_sha256, "report_sha256": report_sha}))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", type=Path, help="Completed full GGUF evaluation JSON report")
    arguments = parser.parse_args()
    package(arguments.report)


if __name__ == "__main__":
    main()
