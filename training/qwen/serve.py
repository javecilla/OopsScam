"""Serve a GGUF on laptop loopback for evaluation; never used by the Android app.

Run with the explicit GGUF path. The SHA-256 alias lets the evaluator reject a
server running a different model. Ctrl+C stops the child server.
"""

import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path

from runtime import ARTIFACTS


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("model", type=Path)
    args = parser.parse_args()
    model = args.model.resolve(strict=True)
    if model.suffix != ".gguf" or model.stat().st_size < 100_000_000:
        raise ValueError(f"Expected a complete GGUF model, got {model}")
    with model.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    executable = ARTIFACTS / "tools/llama-server.exe"
    executable.resolve(strict=True)
    command = [str(executable), "--model", str(model), "--alias", digest,
               "--host", "127.0.0.1", "--port", "8765", "--threads", "6",
               "--ctx-size", "2048", "--jinja", "--chat-template-kwargs",
               json.dumps({"enable_thinking": False}), "--no-webui", "--log-disable"]
    print(json.dumps({"stage": "local_gguf_evaluation_server", "model_sha256": digest,
                      "endpoint": "http://127.0.0.1:8765", "phone_server": False}), flush=True)
    with subprocess.Popen(command, creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0) as server:
        try:
            exit_code = server.wait()
        except KeyboardInterrupt:
            server.terminate()
            server.wait(timeout=30)
            return
        if exit_code != 0:
            raise subprocess.CalledProcessError(exit_code, command)


if __name__ == "__main__":
    main()
