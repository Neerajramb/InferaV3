from __future__ import annotations

import re

SENTENCE_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(\[])")


def _split_units(text: str) -> list[str]:
    """Split into paragraphs, then sentences, keeping natural boundaries."""
    units: list[str] = []
    for paragraph in re.split(r"\n\s*\n", text):
        paragraph = " ".join(paragraph.split())
        if not paragraph:
            continue
        units.extend(s.strip() for s in SENTENCE_RE.split(paragraph) if s.strip())
    return units


def chunk_text(text: str, chunk_size: int = 900, overlap: int = 150) -> list[str]:
    """Pack sentences into chunks of roughly `chunk_size` characters.

    Consecutive chunks share about `overlap` characters of trailing sentences
    so an answer that straddles a boundary is still retrievable. Sentences
    longer than a chunk are hard-split.
    """
    units: list[str] = []
    for unit in _split_units(text or ""):
        if len(unit) <= chunk_size:
            units.append(unit)
        else:
            step = chunk_size - overlap
            units.extend(unit[i:i + chunk_size] for i in range(0, len(unit), step))

    chunks: list[str] = []
    current: list[str] = []
    length = 0
    for unit in units:
        if current and length + len(unit) + 1 > chunk_size:
            chunks.append(" ".join(current))
            tail: list[str] = []
            tail_len = 0
            for previous in reversed(current):
                if tail_len + len(previous) > overlap:
                    break
                tail.insert(0, previous)
                tail_len += len(previous) + 1
            current, length = tail, tail_len
        current.append(unit)
        length += len(unit) + 1
    if current:
        chunks.append(" ".join(current))
    return chunks
