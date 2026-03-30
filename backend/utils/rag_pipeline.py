from __future__ import annotations

from pathlib import Path
import re

from django.utils import timezone
from workspace.models import Document

from .chunker import chunk_text
from .embedding import embedding_service
from .faiss_store import faiss_store
from .text_extractor import extract_text


# =========================
# 📦 NAMESPACES
# =========================
def _namespaces(document: Document) -> list[str]:
    namespaces = ["global_documents"]
    if document.project_id:
        namespaces.append(f"project_{document.project_id}")
    return namespaces


# =========================
# 📄 DOCUMENT PROCESSING
# =========================
def process_uploaded_document(document: Document) -> int:
    file_path = Path(document.file.path)
    text = extract_text(file_path)

    # 🔥 Smaller chunks = better retrieval
    chunks = chunk_text(text, chunk_size=300, overlap=80)

    if not chunks:
        document.chunk_count = 0
        document.indexed_at = timezone.now()
        document.save(update_fields=["chunk_count", "indexed_at"])
        return 0

    vectors = embedding_service.embed_texts(chunks)

    payloads = [
        {
            "document_id": document.id,
            "document_title": document.title,
            "project_id": document.project_id,
            "chunk_index": index,
            "text": chunk,
        }
        for index, chunk in enumerate(chunks)
    ]

    for namespace in _namespaces(document):
        faiss_store.add_embeddings(namespace, vectors, payloads)

    document.chunk_count = len(chunks)
    document.indexed_at = timezone.now()
    document.save(update_fields=["chunk_count", "indexed_at"])

    return len(chunks)


def delete_document_from_index(document: Document) -> None:
    for namespace in _namespaces(document):
        faiss_store.remove_document(namespace, document.id)


# =========================
# 🧠 OFFLINE RESPONSE ENGINE (NO GEMINI)
# =========================
def _gemini_response(query_text: str, contexts: list[dict]) -> str:
    import requests
    import re

    if not contexts:
        return "No relevant information found."

    # 🔹 Top 3 chunks
    top_chunks = [c.get("text", "") for c in contexts[:3]]

    cleaned_chunks = []
    for chunk in top_chunks:
        chunk = re.sub(r"\s+", " ", chunk)
        chunk = re.sub(r"(\w)\s+(?=\w)", r"\1", chunk)
        cleaned_chunks.append(chunk.strip())

    context_text = "\n\n".join(cleaned_chunks)

    prompt = f"""
Answer clearly using ONLY the context below.
Do not copy text directly. Summarize.

Context:
{context_text}

Question:
{query_text}

Answer:
"""

    try:
        response = requests.post(
        "http://127.0.0.1:11434/api/generate",
            json={
                "model": "mistral:latest",
                "prompt": prompt,
                "stream": False
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )

        # 🔥 DEBUG (TEMP)
        print("STATUS:", response.status_code)
        print("RAW:", response.text)

        if response.status_code != 200:
            raise Exception("Ollama error")

        data = response.json()

        # 🔥 KEY FIX
        if "response" in data:
            return data["response"].strip()

        return "⚠️ No response from local AI."

    except Exception as e:
        combined = " ".join(cleaned_chunks)[:500]

        return f"""
⚠️ Local AI not available. Showing best match:

{combined}
"""

# =========================
# 🔍 QUERY HANDLING
# =========================
def answer_query(user, query_text: str, project=None, top_k: int = 5) -> dict:
    query_vector = embedding_service.embed_text(query_text)

    namespaces = [f"project_{project.id}"] if project else ["global_documents"]

    matches = []
    for namespace in namespaces:
        matches.extend(faiss_store.search(namespace, query_vector, top_k=top_k))

    # 🔹 Sort by relevance
    matches = sorted(
        matches,
        key=lambda item: item.get("score", 0),
        reverse=True
    )[:top_k]

    # 🔥 REMOVE DUPLICATES
    seen = set()
    unique_matches = []

    for item in matches:
        text = item.get("text")
        if text and text not in seen:
            seen.add(text)
            unique_matches.append(item)

    matches = unique_matches

    # 🧠 Generate response (offline)
    response_text = _gemini_response(query_text, matches)

    # 📄 Sources
    sources = [
        {
            "document_id": item.get("document_id"),
            "document_title": item.get("document_title"),
            "chunk_index": item.get("chunk_index"),
            "score": item.get("score"),
        }
        for item in matches
    ]

    return {
        "response": response_text,
        "sources": sources,
    }