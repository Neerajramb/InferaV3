"""Answer generation providers.

- ollama: local model server (default, keeps data on the machine)
- gemini: Google's API, opt-in only via LLM_PROVIDER=gemini
- extractive: no model at all; quotes the best matching sentences
"""
from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import asdict, dataclass
from typing import Iterator

import requests
from django.conf import settings

from .embedding import tokenize

logger = logging.getLogger("infera.llm")

STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "to", "of", "in", "on", "for", "and", "or", "what",
    "who", "how", "why", "when", "where", "which", "does", "do", "did", "it", "this", "that", "with", "as",
    "by", "about", "from", "at", "me", "tell", "can", "you", "please", "i", "we", "our", "my", "any", "there",
}


@dataclass
class ProviderStatus:
    provider: str  # ollama | gemini | extractive
    model: str
    available: bool
    detail: str = ""

    def as_dict(self) -> dict:
        return asdict(self)


_status_cache: tuple[float, ProviderStatus] | None = None
STATUS_TTL = 15.0


def _ollama_status() -> ProviderStatus:
    try:
        response = requests.get(f"{settings.OLLAMA_URL}/api/tags", timeout=1.5)
        response.raise_for_status()
        names = {m.get("name", "") for m in response.json().get("models", [])}
        wanted = settings.OLLAMA_MODEL
        if wanted in names or f"{wanted}:latest" in names:
            return ProviderStatus("ollama", wanted, True, "Local model ready")
        return ProviderStatus("ollama", wanted, False, f"The {wanted} model is not installed on the server")
    except Exception:
        return ProviderStatus("ollama", settings.OLLAMA_MODEL, False, "No language model is connected")


def provider_status(force: bool = False) -> ProviderStatus:
    """The provider that will answer the next question, with a short cache."""
    global _status_cache
    now = time.monotonic()
    if not force and _status_cache and now - _status_cache[0] < STATUS_TTL:
        return _status_cache[1]

    mode = settings.LLM_PROVIDER
    status: ProviderStatus
    if mode in {"auto", "ollama"}:
        ollama = _ollama_status()
        status = ollama if ollama.available else ProviderStatus("extractive", "passage-extraction", True, ollama.detail)
    elif mode == "gemini":
        if settings.GEMINI_API_KEY:
            status = ProviderStatus("gemini", settings.GEMINI_MODEL, True, "Sends retrieved passages to Google")
        else:
            status = ProviderStatus("extractive", "passage-extraction", True, "GEMINI_API_KEY is not set")
    else:
        status = ProviderStatus("extractive", "passage-extraction", True, "Language model disabled")

    _status_cache = (now, status)
    return status


def reset_status_cache() -> None:
    global _status_cache
    _status_cache = None


# --- Generation -----------------------------------------------------------------


def _stream_ollama(messages: list[dict]) -> Iterator[str]:
    with requests.post(
        f"{settings.OLLAMA_URL}/api/chat",
        json={
            "model": settings.OLLAMA_MODEL,
            "messages": messages,
            "stream": True,
            "options": {"temperature": 0.2},
        },
        stream=True,
        timeout=(5, settings.LLM_TIMEOUT_SECONDS),
    ) as response:
        response.raise_for_status()
        for line in response.iter_lines():
            if not line:
                continue
            data = json.loads(line)
            if data.get("error"):
                raise RuntimeError(data["error"])
            token = data.get("message", {}).get("content", "")
            if token:
                yield token
            if data.get("done"):
                break


def _stream_gemini(messages: list[dict]) -> Iterator[str]:
    import google.generativeai as genai

    genai.configure(api_key=settings.GEMINI_API_KEY)
    system = "\n".join(m["content"] for m in messages if m["role"] == "system")
    contents = [
        {"role": "model" if m["role"] == "assistant" else "user", "parts": [m["content"]]}
        for m in messages
        if m["role"] != "system"
    ]
    model = genai.GenerativeModel(settings.GEMINI_MODEL, system_instruction=system or None)
    for chunk in model.generate_content(contents, stream=True, generation_config={"temperature": 0.2}):
        text = getattr(chunk, "text", "")
        if text:
            yield text


MARKDOWN_NOISE = re.compile(r"(^|\s)(#{1,6}|[*_]{2,}|>)\s*")


QUOTE_CHARS = 320
# In passage mode, only quote passages that are close to the best match.
QUOTE_RELATIVE_CUTOFF = 0.75


def _clip(text: str, limit: int = QUOTE_CHARS) -> str:
    text = " ".join(text.split())
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0]
    return f"{cut}..."


def _best_sentences(text: str, query_terms: set[str], limit: int = 2) -> list[str]:
    text = MARKDOWN_NOISE.sub(" ", text).strip()
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.strip()) > 25]
    if not sentences:
        return [_clip(text, 280)]
    scored = sorted(
        enumerate(sentences),
        key=lambda pair: (-len(query_terms & set(tokenize(pair[1]))), pair[0]),
    )
    chosen = sorted(scored[:limit], key=lambda pair: pair[0])
    return [sentence for _, sentence in chosen]


def extractive_answer(query: str, hits: list[dict]) -> str:
    """Quote the strongest passages when no language model is available.

    Citation numbers match the position of each hit in the source list.
    """
    if not hits:
        return "I couldn't find anything about that in the documents you can access."
    terms = {t for t in tokenize(query) if t not in STOPWORDS}
    best = max(hit.get("relevance", hit.get("score", 0.0)) for hit in hits)
    lines = ["Here are the passages in your workspace that best match your question.", ""]
    for number, hit in enumerate(hits[:4], start=1):
        if number > 1 and hit.get("relevance", hit.get("score", 0.0)) < best * QUOTE_RELATIVE_CUTOFF:
            continue
        quote = _clip(" ".join(_best_sentences(hit["text"], terms)))
        lines.append(f"> {quote} [{number}]")
        lines.append("")
    return "\n".join(lines).strip()


def _chunked(text: str, size: int = 24) -> Iterator[str]:
    for start in range(0, len(text), size):
        yield text[start:start + size]


def stream_answer(messages: list[dict], query: str, hits: list[dict]) -> tuple[ProviderStatus, Iterator[str]]:
    """Pick a provider and return (status, token iterator).

    If the model fails before producing any text, fall back to an extractive
    answer so the user still gets something useful.
    """
    status = provider_status()

    def generate() -> Iterator[str]:
        if status.provider == "extractive" or not hits:
            yield from _chunked(extractive_answer(query, hits))
            return
        produced = False
        try:
            source = _stream_ollama(messages) if status.provider == "ollama" else _stream_gemini(messages)
            for token in source:
                produced = True
                yield token
        except Exception as exc:
            logger.warning("%s generation failed: %s", status.provider, exc)
            reset_status_cache()
            if produced:
                yield "\n\n_The model stopped responding before finishing this answer._"
            else:
                yield from _chunked(extractive_answer(query, hits))

    return status, generate()
