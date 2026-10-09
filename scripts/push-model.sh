#!/usr/bin/env bash
# Copy the GGUF model into the app's files folder on a USB-connected phone (FR-LM-01).
# The app reads it from Paths.document = /data/data/<package>/files (src/llm/llama.ts).
# Works with debug/development builds (uses `run-as`). Install the app once before running this.
#
# Usage: bash scripts/push-model.sh [path/to/model.gguf]
set -euo pipefail

PACKAGE="com.oopsscam.app"
MODEL="${1:-models/Qwen_Qwen3-0.6B-Q4_K_M.gguf}"
NAME="$(basename "$MODEL")"
TMP="/data/local/tmp/$NAME"

if [ ! -f "$MODEL" ]; then
  echo "Model not found: $MODEL" >&2
  echo "Get it from main (git lfs pull) or huggingface.co/bartowski/Qwen_Qwen3-0.6B-GGUF" >&2
  exit 1
fi

adb push "$MODEL" "$TMP"
adb shell run-as "$PACKAGE" mkdir -p files
adb shell run-as "$PACKAGE" cp "$TMP" "files/$NAME"
adb shell rm "$TMP"
adb shell run-as "$PACKAGE" ls -l "files/$NAME"
echo "Done. Restart the app; the status strip should show the LLM."
