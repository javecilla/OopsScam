"""Shared offline Qwen prompts, input validation and grammar-constrained inference.

Training targets contain only verdicts, since the source datasets do not supply
human-authored Taglish explanations. No confidence calibration is claimed.
"""

import json
from pathlib import Path
from typing import TypedDict

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer, PreTrainedTokenizerBase, Qwen3ForCausalLM

from data import Message, Verdict

ARTIFACTS = Path(__file__).resolve().parent / "artifacts"
VERDICTS: tuple[Verdict, ...] = ("scam", "suspicious", "low_risk")
PROMPT_FILE = Path(__file__).resolve().parents[2] / "src/llm/classification-prompt.json"
PROMPT_DATA = json.loads(PROMPT_FILE.read_text(encoding="utf-8"))
SYSTEM_PROMPT: str = PROMPT_DATA["system"]
if not isinstance(SYSTEM_PROMPT, str) or not SYSTEM_PROMPT:
    raise ValueError(f"Classification prompt is missing its system instruction: {PROMPT_FILE}")


class ChatMessage(TypedDict):
    role: str
    content: str


def chat_messages(text: str) -> list[ChatMessage]:
    escaped = text.replace("<", "‹").replace(">", "›")
    return [{"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"<message>\n{escaped}\n</message>\n/no_think"}]


def answer_text(verdict: Verdict) -> str:
    return json.dumps({"verdict": verdict}, separators=(",", ":"))


def prompt_tokens(tokenizer: PreTrainedTokenizerBase, text: str) -> list[int]:
    tokens = tokenizer.apply_chat_template(chat_messages(text), tokenize=True,
                                          add_generation_prompt=True, enable_thinking=False)
    if not isinstance(tokens, list) or not all(isinstance(token, int) for token in tokens):
        raise TypeError("Qwen chat template did not return a list of integer token IDs")
    return tokens


def load_rows(path: Path) -> list[Message]:
    messages: list[Message] = []
    for index, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        row = json.loads(line)
        if not isinstance(row, dict):
            raise ValueError(f"Classification row is not an object: {path}:{index}")
        text, verdict, source, source_row, original_label = (
            row.get("text"), row.get("verdict"), row.get("source"), row.get("row"),
            row.get("original_label"))
        if not isinstance(text, str) or not text:
            raise ValueError(f"Classification row has no text: {path}:{index}")
        if verdict not in VERDICTS or not isinstance(source, str):
            raise ValueError(f"Classification row has invalid verdict/source: {path}:{index}")
        if not isinstance(source_row, int) or isinstance(source_row, bool) or not isinstance(original_label, str):
            raise ValueError(f"Classification row has invalid provenance: {path}:{index}")
        messages.append(Message(text, verdict, source, source_row, original_label))
    if not messages:
        raise ValueError(f"Classification data is empty: {path}")
    return messages


def load_base_model() -> tuple[Qwen3ForCausalLM, PreTrainedTokenizerBase]:
    tokenizer = AutoTokenizer.from_pretrained(ARTIFACTS / "base", local_files_only=True,
                                             trust_remote_code=False)
    model = AutoModelForCausalLM.from_pretrained(ARTIFACTS / "base", dtype=torch.float32,
                                               local_files_only=True, trust_remote_code=False,
                                               attn_implementation="sdpa")
    if not isinstance(model, Qwen3ForCausalLM):
        raise TypeError(f"Expected a Qwen3 causal language model, received {type(model).__name__}")
    return model, tokenizer


def predict(model: Qwen3ForCausalLM | PeftModel,
            tokenizer: PreTrainedTokenizerBase, text: str) -> Verdict:
    prefix = prompt_tokens(tokenizer, text)
    eos = tokenizer.eos_token_id
    if not isinstance(eos, int):
        raise ValueError("Qwen tokenizer has no integer EOS token")
    answers = [tokenizer.encode(answer_text(verdict), add_special_tokens=False) + [eos]
               for verdict in VERDICTS]

    def allowed_tokens(batch_id: int, input_ids: torch.Tensor) -> list[int]:
        if batch_id != 0:
            raise ValueError(f"Classification supports one message per inference, got batch {batch_id}")
        generated: list[int] = input_ids[len(prefix):].tolist()
        allowed = sorted({answer[len(generated)] for answer in answers
                          if answer[:len(generated)] == generated and len(generated) < len(answer)})
        if not allowed:
            raise ValueError(f"Classification grammar has no valid continuation: tokens={generated}")
        return allowed

    inputs = torch.tensor([prefix], dtype=torch.long, device=model.device)
    model.eval()
    with torch.inference_mode():
        output = model.generate(input_ids=inputs, attention_mask=torch.ones_like(inputs),
                                max_new_tokens=24, do_sample=False, use_cache=True,
                                pad_token_id=eos, eos_token_id=eos,
                                prefix_allowed_tokens_fn=allowed_tokens)
    raw = tokenizer.decode(output[0, len(prefix):], skip_special_tokens=True).strip()
    result = json.loads(raw)
    verdict = result.get("verdict")
    if verdict not in VERDICTS:
        raise ValueError(f"Qwen returned an invalid classification: {raw}")
    return verdict
