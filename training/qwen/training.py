"""Validated training configuration and a small classification-only LoRA update.

Only assistant answer tokens contribute to loss. Restricting output logits to
those tokens avoids allocating a full vocabulary matrix for the whole prompt.
"""

import json
import math
import random
from dataclasses import dataclass
from pathlib import Path

import torch
from peft import LoraConfig, PeftModel, TaskType, get_peft_model
from transformers import PreTrainedTokenizerBase, Qwen3ForCausalLM

from data import Message
from runtime import VERDICTS, answer_text, prompt_tokens


@dataclass(frozen=True)
class TrainingConfig:
    seed: int
    epochs: int
    examples_per_class: int
    learning_rate: float
    gradient_accumulation: int
    lora_rank: int
    lora_alpha: int
    layers: tuple[int, ...]
    threads: int
    max_tokens: int


def positive_int(value: object, field: str) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
        raise ValueError(f"Qwen training config {field} must be a positive integer; got {value!r}")
    return value


def load_config(path: Path) -> TrainingConfig:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"Training config must be an object: {path}")
    layers = data.get("layers")
    rate = data.get("learning_rate")
    if not isinstance(layers, list) or not layers or any(
        not isinstance(layer, int) or isinstance(layer, bool) or not 0 <= layer < 28
        for layer in layers
    ) or len(set(layers)) != len(layers):
        raise ValueError("Qwen layers must be distinct integer indices from 0 through 27")
    if not isinstance(rate, (float, int)) or isinstance(rate, bool) or not math.isfinite(rate) or rate <= 0:
        raise ValueError(f"Qwen learning_rate must be finite and positive; got {rate!r}")
    return TrainingConfig(
        seed=positive_int(data.get("seed"), "seed"), epochs=positive_int(data.get("epochs"), "epochs"),
        examples_per_class=positive_int(data.get("examples_per_class"), "examples_per_class"),
        learning_rate=float(rate),
        gradient_accumulation=positive_int(data.get("gradient_accumulation"), "gradient_accumulation"),
        lora_rank=positive_int(data.get("lora_rank"), "lora_rank"),
        lora_alpha=positive_int(data.get("lora_alpha"), "lora_alpha"), layers=tuple(layers),
        threads=positive_int(data.get("threads"), "threads"),
        max_tokens=positive_int(data.get("max_tokens"), "max_tokens"),
    )


def attach_adapter(base: Qwen3ForCausalLM, config: TrainingConfig) -> PeftModel:
    lora = LoraConfig(task_type=TaskType.CAUSAL_LM, r=config.lora_rank,
                      lora_alpha=config.lora_alpha, lora_dropout=0.0,
                      target_modules=["q_proj", "v_proj"],
                      layers_to_transform=list(config.layers), bias="none")
    return get_peft_model(base, lora)


def select_training_rows(messages: list[Message], config: TrainingConfig) -> list[Message]:
    rng = random.Random(config.seed)
    selected: list[Message] = []
    for verdict in VERDICTS:
        group = [message for message in messages if message.verdict == verdict]
        if not group:
            raise ValueError(f"Training split contains no {verdict} messages")
        rng.shuffle(group)
        selected.extend(group[:config.examples_per_class])
    rng.shuffle(selected)
    return selected


def select_tuning_rows(messages: list[Message]) -> list[Message]:
    """Use the same fixed 96-message tuning smoke check before and during training."""
    selected: list[Message] = []
    for verdict in VERDICTS:
        group = [message for message in messages if message.verdict == verdict]
        if len(group) < 32:
            raise ValueError(f"Tuning split needs 32 {verdict} messages; found {len(group)}")
        selected.extend(group[:32])
    return selected


def example_tokens(tokenizer: PreTrainedTokenizerBase, message: Message,
                   max_tokens: int) -> tuple[torch.Tensor, int]:
    prefix = prompt_tokens(tokenizer, message.text)
    answer = tokenizer.encode(answer_text(message.verdict) + "<|im_end|>", add_special_tokens=False)
    tokens = prefix + answer
    if len(tokens) > max_tokens:
        raise ValueError(f"Training message exceeds {max_tokens} tokens: {message.source}:{message.row}; "
                         f"actual_tokens={len(tokens)}. Increase max_tokens; text was not truncated.")
    return torch.tensor([tokens], dtype=torch.long), len(answer)


def classification_loss(model: PeftModel, tokens: torch.Tensor, answer_count: int) -> torch.Tensor:
    inputs = tokens.to(model.device)
    output = model(input_ids=inputs, attention_mask=torch.ones_like(inputs),
                   use_cache=False, logits_to_keep=answer_count + 1)
    return torch.nn.functional.cross_entropy(output.logits[0, :-1, :], inputs[0, -answer_count:])
