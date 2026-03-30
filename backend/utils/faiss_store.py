from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
from django.conf import settings


class FAISSVectorStore:
    def __init__(self, storage_root: Path | None = None):
        self.storage_root = Path(storage_root or settings.RAG_STORAGE_ROOT)
        self.storage_root.mkdir(parents=True, exist_ok=True)

    def _paths(self, namespace: str) -> dict[str, Path]:
        safe = namespace.replace("/", "_")
        return {
            "vectors": self.storage_root / f"{safe}.vectors.npy",
            "payloads": self.storage_root / f"{safe}.payloads.json",
        }

    def _load(self, namespace: str) -> tuple[np.ndarray, list[dict[str, Any]]]:
        paths = self._paths(namespace)
        if not paths["vectors"].exists() or not paths["payloads"].exists():
            return np.zeros((0, 0), dtype=np.float32), []
        vectors = np.load(paths["vectors"])
        payloads = json.loads(paths["payloads"].read_text(encoding="utf-8"))
        return np.asarray(vectors, dtype=np.float32), payloads

    def _save(self, namespace: str, vectors: np.ndarray, payloads: list[dict[str, Any]]) -> None:
        paths = self._paths(namespace)
        np.save(paths["vectors"], vectors.astype(np.float32))
        paths["payloads"].write_text(json.dumps(payloads, ensure_ascii=True), encoding="utf-8")

    def add_embeddings(self, namespace: str, vectors: np.ndarray, payloads: list[dict[str, Any]]) -> None:
        vectors = np.asarray(vectors, dtype=np.float32)
        existing_vectors, existing_payloads = self._load(namespace)
        if existing_vectors.size == 0:
            combined_vectors = vectors
        elif existing_vectors.shape[1] == vectors.shape[1]:
            combined_vectors = np.vstack([existing_vectors, vectors])
        else:
            combined_vectors = vectors
            existing_payloads = []
        combined_payloads = [*existing_payloads, *payloads]
        self._save(namespace, combined_vectors, combined_payloads)

    def remove_document(self, namespace: str, document_id: int) -> None:
        vectors, payloads = self._load(namespace)
        if not payloads:
            return

        keep_indices = [index for index, payload in enumerate(payloads) if payload.get("document_id") != document_id]
        if len(keep_indices) == len(payloads):
            return

        if not keep_indices:
            self._save(namespace, np.zeros((0, 0), dtype=np.float32), [])
            return

        filtered_vectors = vectors[keep_indices] if vectors.size else np.zeros((0, 0), dtype=np.float32)
        filtered_payloads = [payloads[index] for index in keep_indices]
        self._save(namespace, filtered_vectors, filtered_payloads)

    def search(self, namespace: str, query_vector: np.ndarray, top_k: int = 5) -> list[dict[str, Any]]:
        vectors, payloads = self._load(namespace)
        if vectors.size == 0 or not payloads:
            return []

        query = np.asarray(query_vector, dtype=np.float32).reshape(1, -1)
        limit = min(top_k, len(payloads))

        try:
            import faiss

            index = faiss.IndexFlatIP(vectors.shape[1])
            index.add(vectors.astype(np.float32))
            scores, indices = index.search(query.astype(np.float32), limit)
            ranked = []
            for score, idx in zip(scores[0], indices[0]):
                if idx < 0:
                    continue
                item = dict(payloads[idx])
                item["score"] = float(score)
                ranked.append(item)
            return ranked
        except Exception:
            similarities = vectors @ query.T
            order = np.argsort(similarities[:, 0])[::-1][:limit]
            ranked = []
            for idx in order:
                item = dict(payloads[int(idx)])
                item["score"] = float(similarities[int(idx), 0])
                ranked.append(item)
            return ranked


faiss_store = FAISSVectorStore()
