from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from django.conf import settings
from django.utils import timezone

from workspace.models import Document, IndexStatus, Note

from .chunker import chunk_text
from .embedding import embedding_service, tokenize
from .faiss_store import EntityKey, vector_store
from .llm import MARKDOWN_NOISE, STOPWORDS
from .tasks import run_task
from .text_extractor import extract_text

logger = logging.getLogger("infera.rag")

MIN_RELEVANCE = 0.18
# Drop hits far weaker than the best one; they are almost always off-topic.
RELATIVE_CUTOFF = 0.45
LEXICAL_WEIGHT = 0.25
SNIPPET_CHARS = 320


# --- Indexing -------------------------------------------------------------------


def _payloads(entity_type: str, entity_id: int, title: str, chunks: list[str]) -> list[dict[str, Any]]:
    return [
        {"entity_type": entity_type, "entity_id": entity_id, "title": title, "chunk_index": i, "text": chunk}
        for i, chunk in enumerate(chunks)
    ]


def index_document(document_id: int) -> int:
    document = Document.objects.filter(pk=document_id).first()
    if document is None:
        return 0
    Document.objects.filter(pk=document_id).update(status=IndexStatus.PROCESSING, error="")
    try:
        text = extract_text(Path(document.file.path))
        chunks = chunk_text(text)
        if not chunks:
            raise ValueError("No readable text found. Scanned PDFs need OCR before upload.")
        vectors = embedding_service.embed_texts(chunks)
        vector_store.replace_entity("document", document.id, vectors, _payloads("document", document.id, document.title, chunks))
        Document.objects.filter(pk=document_id).update(
            status=IndexStatus.READY, chunk_count=len(chunks), indexed_at=timezone.now(), error=""
        )
        logger.info("Indexed document %s (%d chunks)", document.title, len(chunks))
        return len(chunks)
    except Exception as exc:
        logger.warning("Indexing document %s failed: %s", document_id, exc)
        vector_store.remove_entity("document", document_id)
        Document.objects.filter(pk=document_id).update(status=IndexStatus.FAILED, chunk_count=0, error=str(exc)[:500])
        return 0


def index_note(note_id: int) -> int:
    note = Note.objects.filter(pk=note_id).first()
    if note is None:
        return 0
    Note.objects.filter(pk=note_id).update(status=IndexStatus.PROCESSING)
    try:
        chunks = chunk_text(f"{note.title}\n\n{note.content}")
        vectors = embedding_service.embed_texts(chunks)
        vector_store.replace_entity("note", note.id, vectors, _payloads("note", note.id, note.title, chunks))
        Note.objects.filter(pk=note_id).update(status=IndexStatus.READY, chunk_count=len(chunks), indexed_at=timezone.now())
        return len(chunks)
    except Exception:
        logger.exception("Indexing note %s failed", note_id)
        Note.objects.filter(pk=note_id).update(status=IndexStatus.FAILED)
        return 0


def schedule_document_index(document: Document) -> None:
    run_task(index_document, document.id)


def schedule_note_index(note: Note) -> None:
    run_task(index_note, note.id)


def remove_from_index(entity_type: str, entity_id: int) -> None:
    run_task(vector_store.remove_entity, entity_type, entity_id)


# --- Retrieval ------------------------------------------------------------------


@dataclass
class Scope:
    project_id: int | None = None
    folder_ids: list[int] = field(default_factory=list)
    document_ids: list[int] = field(default_factory=list)
    note_ids: list[int] = field(default_factory=list)


def allowed_keys(user, scope: Scope) -> set[EntityKey]:
    """Every (entity_type, id) the user may read, narrowed by the chat scope."""
    from workspace.access import folder_descendant_ids, visible_documents, visible_folders, visible_notes

    documents = visible_documents(user)
    notes = visible_notes(user)
    if scope.project_id:
        documents = documents.filter(project_id=scope.project_id)
        notes = notes.filter(project_id=scope.project_id)
    if scope.folder_ids:
        permitted = list(visible_folders(user).filter(id__in=scope.folder_ids).values_list("id", flat=True))
        folders = folder_descendant_ids(permitted)
        documents = documents.filter(folder_id__in=folders)
        notes = notes.filter(folder_id__in=folders)
    if scope.document_ids or scope.note_ids:
        documents = documents.filter(id__in=scope.document_ids)
        notes = notes.filter(id__in=scope.note_ids)

    keys = {("document", pk) for pk in documents.values_list("id", flat=True)}
    keys |= {("note", pk) for pk in notes.values_list("id", flat=True)}
    return keys


def _lexical_overlap(query_terms: set[str], text: str) -> float:
    if not query_terms:
        return 0.0
    return len(query_terms & set(tokenize(text))) / len(query_terms)


def retrieve(user, query: str, scope: Scope, top_k: int | None = None) -> list[dict[str, Any]]:
    top_k = top_k or settings.RAG_TOP_K
    allowed = allowed_keys(user, scope)
    if not allowed:
        return []
    candidates = vector_store.search(embedding_service.embed_text(query), allowed, top_k=max(top_k * 4, 24))
    terms = {t for t in tokenize(query) if t not in STOPWORDS}
    for hit in candidates:
        # The title counts too, so "summarize badge-policy.txt" favours that file.
        hit["relevance"] = hit["score"] + LEXICAL_WEIGHT * _lexical_overlap(terms, f"{hit['title']} {hit['text']}")
    ranked = sorted(candidates, key=lambda h: h["relevance"], reverse=True)
    if not ranked:
        return []
    floor = max(MIN_RELEVANCE, ranked[0]["relevance"] * RELATIVE_CUTOFF)
    return [hit for hit in ranked if hit["relevance"] >= floor][:top_k]


def source_list(hits: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "n": number,
            "entity_type": hit["entity_type"],
            "entity_id": hit["entity_id"],
            "title": hit["title"],
            "chunk_index": hit["chunk_index"],
            "score": round(float(hit["relevance"]), 4),
            "snippet": " ".join(MARKDOWN_NOISE.sub(" ", hit["text"]).split())[:SNIPPET_CHARS],
        }
        for number, hit in enumerate(hits, start=1)
    ]


# --- Prompting ------------------------------------------------------------------

SYSTEM_PROMPT = """You are Infera, an assistant that answers questions using only the team's own documents and notes.

Rules:
- Use only the numbered passages provided. Do not use outside knowledge.
- Cite every claim inline with the passage number in square brackets, like [2].
- Copy names, numbers, dates and quoted terms exactly as written.
- If the passages do not contain the answer, say you could not find it in the workspace.
- Be concise. Use short paragraphs, bullet lists or tables when they make the answer clearer."""


def build_messages(query: str, hits: list[dict[str, Any]], history: list[dict[str, str]]) -> list[dict[str, str]]:
    passages = "\n\n".join(
        f"[{n}] {hit['title']} (part {hit['chunk_index'] + 1})\n{hit['text']}" for n, hit in enumerate(hits, start=1)
    )
    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for turn in history[-6:]:
        role = "user" if turn["role"] == "user" else "assistant"
        messages.append({"role": role, "content": turn["content"][:1500]})
    messages.append({
        "role": "user",
        "content": f"Passages:\n\n{passages or '(no matching passages)'}\n\nQuestion: {query}",
    })
    return messages
