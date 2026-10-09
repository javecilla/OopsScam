"""Convert a validated, merged Qwen checkpoint without publishing it to the app.

Run: training/.gguf-venv/Scripts/python training/qwen/export.py
The selected run must pass independent adapter validation first. Outputs remain
inside that run until separate GGUF classification evaluation passes.
"""

import hashlib
import json
import math
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path

ARTIFACTS = Path(__file__).resolve().parent / "artifacts"
ROOT = Path(__file__).resolve().parents[2]
PROMPT_FILE = ROOT / "src/llm/classification-prompt.json"
LLAMA_CPP = Path(__file__).resolve().parent / "llama.cpp"
LLAMA_COMMIT = "d81235049384534c167caea52b85a694f6103d14"
TOOLS_ARCHIVE_SHA256 = "1283323272b04cd07905816a597a0da810918102de958f4ff6f7bbaa70ed2efe"


@dataclass(frozen=True)
class RunIntegrity:
    data_manifest_sha256: str
    validation_data_sha256: str
    prompt_sha256: str
    adapter_sha256: str


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_object(path: Path) -> dict[str, object]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict) or not all(isinstance(key, str) for key in value):
        raise ValueError(f"Expected a JSON object: {path}")
    return value


def selected_run() -> Path:
    selected = read_object(ARTIFACTS / "selected_run.json")
    name = selected.get("run")
    if not isinstance(name, str) or not name:
        raise ValueError("Qwen selected_run.json has no run path")
    run = Path(name).resolve()
    if not run.is_relative_to((ARTIFACTS / "runs").resolve()) or not run.is_dir():
        raise ValueError(f"Qwen selected run is not a directory inside training runs: {run}")
    return run


def check_training_integrity(run: Path) -> RunIntegrity:
    metadata = read_object(run / "metadata.json")
    if metadata.get("status") != "trained_not_validated":
        raise ValueError(f"Qwen run has not completed training: {run}")
    manifest_path = ARTIFACTS / "data/manifest.json"
    manifest_sha = file_sha256(manifest_path)
    prompt_sha = file_sha256(PROMPT_FILE)
    for field, actual in (("data_manifest_sha256", manifest_sha), ("prompt_sha256", prompt_sha)):
        if metadata.get(field) != actual:
            raise ValueError(f"Qwen training integrity mismatch: field={field}, run={run}")
    manifest = read_object(manifest_path)
    split_hashes = manifest.get("split_hashes")
    if not isinstance(split_hashes, dict):
        raise ValueError(f"Qwen data manifest has no split hashes: {manifest_path}")
    for split in ("train", "tune", "validation"):
        path = ARTIFACTS / "data" / f"{split}.jsonl"
        if split_hashes.get(split) != file_sha256(path):
            raise ValueError(f"Qwen dataset changed after preparation: {path}")
    return RunIntegrity(manifest_sha, file_sha256(ARTIFACTS / "data/validation.jsonl"),
                        prompt_sha, file_sha256(run / "best/adapter_model.safetensors"))


def require_probability(value: object, field: str, path: Path) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"Qwen validation metric must be numeric: field={field}, report={path}")
    result = float(value)
    if not math.isfinite(result) or not 0 <= result <= 1:
        raise ValueError(f"Qwen validation metric must be finite and within [0,1]: field={field}, report={path}")
    return result


def validated_metrics(run: Path, integrity: RunIntegrity) -> tuple[float, float]:
    report_path = run / "validation.json"
    provenance_path = run / "validation-provenance.json"
    provenance = read_object(provenance_path)
    expected = {**asdict(integrity), "report_sha256": file_sha256(report_path)}
    for field, actual in expected.items():
        if provenance.get(field) != actual:
            raise ValueError(f"Qwen validation provenance mismatch: field={field}, run={run}")
    report = read_object(report_path)
    recall = require_probability(report.get("flagged_recall"), "flagged_recall", report_path)
    scam_recall = require_probability(report.get("scam_flagged_recall"), "scam_flagged_recall", report_path)
    false_alarm = require_probability(report.get("false_alarm_rate"), "false_alarm_rate", report_path)
    if recall < 0.9 or scam_recall < 0.9 or false_alarm > 0.1:
        raise ValueError(f"Qwen validation targets not met; do not package: recall={recall:.3f}, "
                         f"scam_flagged_recall={scam_recall:.3f}, false_alarm_rate={false_alarm:.3f}, run={run}")
    return recall, false_alarm


def run_command(arguments: list[str], log: Path) -> None:
    print(json.dumps({"stage": "gguf_export", "command": arguments, "log": str(log)}), flush=True)
    with log.open("x", encoding="utf-8") as stream:
        result = subprocess.run(arguments, stdout=stream, stderr=subprocess.STDOUT, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"GGUF command failed: exit_code={result.returncode}, command={arguments}, "
                           f"log={log}; inspect the log and do not publish its output")


def main() -> None:
    run = selected_run()
    integrity = check_training_integrity(run)
    recall, false_alarm = validated_metrics(run, integrity)
    merged = run / "merged"
    provenance_path = merged / "oopsscam-provenance.json"
    provenance = read_object(provenance_path)
    expected = {**asdict(integrity), "source_run": str(run), "precision": "BF16",
                "validation_sha256": file_sha256(run / "validation.json"),
                "weights_sha256": file_sha256(merged / "model.safetensors"),
                "validation_recall": recall, "validation_false_alarm_rate": false_alarm}
    for field, actual in expected.items():
        if provenance.get(field) != actual:
            raise ValueError(f"Merged Qwen provenance mismatch: field={field}, file={provenance_path}")
    commit = subprocess.run(["git", "-C", str(LLAMA_CPP), "rev-parse", "HEAD"],
                            capture_output=True, text=True, check=True).stdout.strip()
    if commit != LLAMA_COMMIT:
        raise ValueError(f"llama.cpp revision mismatch: expected={LLAMA_COMMIT}, actual={commit}")
    tools = ARTIFACTS / "tools"
    tools_provenance = read_object(tools / "provenance.json")
    if tools_provenance.get("tag") != "b11429" or tools_provenance.get("archive_sha256") != TOOLS_ARCHIVE_SHA256:
        raise ValueError(f"llama.cpp binary provenance mismatch: {tools / 'provenance.json'}")
    converter_python = ROOT / "training/.gguf-venv/Scripts/python.exe"
    quantizer = tools / "llama-quantize.exe"
    for path in (converter_python, quantizer, LLAMA_CPP / "convert_hf_to_gguf.py"):
        if not path.is_file():
            raise FileNotFoundError(f"GGUF export requires installed conversion tooling: {path}")
    output = run / "gguf"
    output.mkdir(exist_ok=False)
    bf16 = output / "OopsScam-Qwen3-0.6B-BF16.gguf"
    quantized = output / "OopsScam-Qwen3-0.6B-Q4_K_M.gguf"
    run_command([str(converter_python), str(LLAMA_CPP / "convert_hf_to_gguf.py"), str(merged),
                 "--outfile", str(bf16), "--outtype", "bf16", "--model-name", "OopsScam-Qwen3-0.6B"],
                output / "conversion.log")
    run_command([str(quantizer), str(bf16), str(quantized), "Q4_K_M", "6"], output / "quantization.log")
    for path in (bf16, quantized):
        with path.open("rb") as stream:
            if stream.read(4) != b"GGUF":
                raise ValueError(f"Converter produced an invalid GGUF header: {path}")
    metadata = {"status": "exported_not_gguf_validated", "source_run": str(run),
                "merged_provenance_sha256": file_sha256(provenance_path),
                "llama_cpp_commit": commit, "tools_archive_sha256": TOOLS_ARCHIVE_SHA256,
                "quantizer_sha256": file_sha256(quantizer), "quantization": "Q4_K_M",
                "bf16_sha256": file_sha256(bf16), "gguf_sha256": file_sha256(quantized),
                "gguf_file": str(quantized), "gguf_bytes": quantized.stat().st_size,
                **asdict(integrity)}
    (output / "provenance.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metadata, indent=2), flush=True)


if __name__ == "__main__":
    main()
