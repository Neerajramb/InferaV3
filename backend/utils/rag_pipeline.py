from __future__ import annotations

from pathlib import Path
from typing import Any

import requests
from django.conf import settings
from django.utils import timezone

from workspace.models import Document, Note

from .chunker import chunk_text
from .embedding import embedding_service
from .faiss_store import faiss_store
from .text_extractor import extract_text


def _document_namespaces(document: Document) -> list[str]:
    namespaces = ["global_documents"]
    if document.project_id:
        namespaces.append(f"project_{document.project_id}_documents")
    return namespaces


def _note_namespaces(note: Note) -> list[str]:
    namespaces = ["global_notes"]
    if note.project_id:
        namespaces.append(f"project_{note.project_id}_notes")
    return namespaces


def process_uploaded_document(document: Document) -> int:
    try:
        file_path = Path(document.file.path)
        print(f"\n🔥 --- RAG PIPELINE DEBUG START --- 🔥")
        print(f"📄 Document: {document.title}")
        print(f"📂 Path: {file_path}")
        print(f"❓ File Exists on Disk?: {file_path.exists()}")

        # 1. Extraction Phase
        text = extract_text(file_path)
        if text is None:
            text = "" # Failsafe
            
        print(f"🔍 TEXT LENGTH EXTRACTED: {len(text)} characters")

        # 2. Chunking Phase
        chunks = chunk_text(text, chunk_size=700, overlap=120)
        print(f"✂️ CHUNKS GENERATED: {len(chunks)}")

        if not chunks:
            print("❌ ERROR: No chunks created. Saving 0 chunks to DB.")
            print(f"🔥 --- RAG PIPELINE DEBUG END --- 🔥\n")
            document.chunk_count = 0
            document.indexed_at = timezone.now()
            document.save(update_fields=["chunk_count", "indexed_at"])
            return 0

        # 3. Embedding Phase
        print("🧠 Connecting to Ollama to generate embeddings...")
        vectors = embedding_service.embed_texts(chunks)
        print(f"🧬 EMBEDDINGS GENERATED: {len(vectors)}")
        
        if len(vectors) != len(chunks):
            print("⚠️ WARNING: Mismatch between chunk count and vector count!")

        # 4. FAISS Storage Phase
        payloads = [
            {
                "entity_type": "document",
                "document_id": document.id,
                "document_title": document.title,
                "project_id": document.project_id,
                "folder_id": document.folder_id,
                "chunk_index": index,
                "text": chunk,
            }
            for index, chunk in enumerate(chunks)
        ]

        print("💾 Saving to FAISS namespaces...")
        namespaces = _document_namespaces(document)
        for namespace in namespaces:
            faiss_store.add_embeddings(namespace, vectors, payloads)
            print(f"✅ Saved {len(chunks)} vectors to FAISS namespace: {namespace}")

        # 5. DB Update
        document.chunk_count = len(chunks)
        document.indexed_at = timezone.now()
        document.save(update_fields=["chunk_count", "indexed_at"])
        
        print(f"🚀 SUCCESS: Pipeline complete. Saved {len(chunks)} chunks.")
        print(f"🔥 --- RAG PIPELINE DEBUG END --- 🔥\n")
        return len(chunks)

    except Exception as e:
        print(f"❌ CRITICAL PIPELINE ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return 0


def process_note(note: Note) -> int:
    chunks = chunk_text(note.content, chunk_size=700, overlap=120)
    if not chunks:
        note.chunk_count = 0
        note.indexed_at = timezone.now()
        note.save(update_fields=["chunk_count", "indexed_at"])
        return 0

    vectors = embedding_service.embed_texts(chunks)
    payloads = [
        {
            "entity_type": "note",
            "note_id": note.id,
            "note_title": note.title,
            "project_id": note.project_id,
            "folder_id": note.folder_id,
            "chunk_index": index,
            "text": chunk,
        }
        for index, chunk in enumerate(chunks)
    ]

    for namespace in _note_namespaces(note):
        faiss_store.add_embeddings(namespace, vectors, payloads)

    note.chunk_count = len(chunks)
    note.indexed_at = timezone.now()
    note.save(update_fields=["chunk_count", "indexed_at"])
    return len(chunks)


def delete_document_from_index(document: Document) -> None:
    for namespace in _document_namespaces(document):
        faiss_store.remove_document(namespace, document.id)


def delete_note_from_index(note: Note) -> None:
    for namespace in _note_namespaces(note):
        faiss_store.remove_note(namespace, note.id)


def _ollama_or_fallback_response(query_text: str, contexts: list[dict[str, Any]]) -> str:
    if not contexts:
        return "No relevant indexed context was found."

    # 🔥 FIX: Add strict boundaries around each chunk
    merged_context = "\n\n".join(
        f"--- START CHUNK {i+1} ---\n{item.get('text', '')}\n--- END CHUNK {i+1} ---"
        for i, item in enumerate(contexts[:10])
    )

    prompt = f"""
You are an expert data extraction AI. Read the chunks of text below.

YOUR RULES:
1. Answer the question using ONLY the provided text chunks.
2. If the text contains specific names of people, you MUST list them exactly as written.
3. DO NOT summarize specific names into groups like "researchers", "team", or "organization".
4. If the answer is not in the chunks, say "I don't know."

TEXT CHUNKS:
{merged_context}

QUESTION:
{query_text}

ANSWER:
"""

    try:
        print("🧠 Sending prompt to Ollama...")
        response = requests.post(
            "http://127.0.0.1:11434/api/generate",
            json={
                "model": "mistral",   # 🔥 Changed to just "mistral"
                "prompt": prompt,
                "stream": False
            },
            headers={"Content-Type": "application/json"},
            timeout=300  # 🔥 Bumped to 120s for cold-starts
        )

        print("OLLAMA STATUS:", response.status_code)

        if response.status_code != 200:
            print("🚨 OLLAMA RAW ERROR:", response.text) 
            raise Exception(f"Ollama failed with status {response.status_code}")

        data = response.json()

        if "response" in data and data["response"].strip():
            return data["response"].strip()

        raise Exception("Empty response from Ollama")

    except Exception as e:
        print("OLLAMA EXCEPTION:", str(e))
        return "⚠️ Local AI failed. Try again or check Ollama."


def _payload_filter(
    folder_ids: list[int] | None = None,
    document_ids: list[int] | None = None,
    note_ids: list[int] | None = None,
) -> Any:
    folder_set = set(folder_ids or [])
    document_set = set(document_ids or [])
    note_set = set(note_ids or [])

    def inner(payload: dict[str, Any]) -> bool:
        if folder_set and payload.get("folder_id") not in folder_set:
            return False
        if document_set and payload.get("entity_type") == "document" and payload.get("document_id") not in document_set:
            return False
        if note_set and payload.get("entity_type") == "note" and payload.get("note_id") not in note_set:
            return False
        if document_set and payload.get("entity_type") == "note" and not note_set:
            return False
        if note_set and payload.get("entity_type") == "document" and not document_set:
            return False
        return True

    return inner


def answer_query(
    user,
    query_text: str,
    project=None,
    top_k: int = 10,
    folder_ids: list[int] | None = None,
    document_ids: list[int] | None = None,
    note_ids: list[int] | None = None,
) -> dict[str, Any]:
    query_vector = embedding_service.embed_text(query_text)

    namespaces = []
    if project:
        namespaces.extend([f"project_{project.id}_documents", f"project_{project.id}_notes"])
    else:
        namespaces.extend(["global_documents", "global_notes"])

    matches = []
    payload_filter = _payload_filter(folder_ids=folder_ids, document_ids=document_ids, note_ids=note_ids)
    for namespace in namespaces:
        matches.extend(
            faiss_store.search(namespace, query_vector, top_k=top_k, payload_filter=payload_filter)
        )

    matches = sorted(matches, key=lambda item: item.get("score", 0), reverse=True)
    deduped_matches: list[dict[str, Any]] = []
    seen = set()
    for item in matches:
        key = (
            item.get("entity_type"),
            item.get("document_id"),
            item.get("note_id"),
            item.get("chunk_index"),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped_matches.append(item)
        if len(deduped_matches) >= top_k:
            break

    response_text = _ollama_or_fallback_response(query_text, deduped_matches)
    sources = [
        {
            "entity_type": item.get("entity_type"),
            "document_id": item.get("document_id"),
            "document_title": item.get("document_title"),
            "note_id": item.get("note_id"),
            "note_title": item.get("note_title"),
            "chunk_index": item.get("chunk_index"),
            "score": item.get("score"),
        }
        for item in deduped_matches
    ]

    return {
        "response": response_text,
        "sources": sources,
    }