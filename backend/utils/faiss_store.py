"""A small persistent vector store backed by NumPy files and FAISS search.

All chunks live in one namespace. Access control happens at query time:
callers pass the set of (entity_type, entity_id) keys the user may read, so
stale payload metadata can never leak a document.
"""
from __future__ import annotations

import json
import logging
import threading
from pathlib import Path
from typing import Any

import numpy as np
from django.conf import settings

logger = logging.getLogger("infera.vectors")

EntityKey = tuple[str, int]
DEFAULT_NAMESPACE = "workspace"


def entity_key(payload: dict[str, Any]) -> EntityKey:
    return payload["entity_type"], int(payload["entity_id"])


class VectorStore:
    def __init__(self, storage_root: Path | None = None, namespace: str = DEFAULT_NAMESPACE):
        self.storage_root = Path(storage_root or settings.RAG_STORAGE_ROOT)
        self.namespace = namespace
        self._vectors: np.ndarray | None = None
        self._payloads: list[dict[str, Any]] = []
        self._lock = threading.RLock()

    @property
    def _vector_path(self) -> Path:
        return self.storage_root / f"{self.namespace}.vectors.npy"

    @property
    def _payload_path(self) -> Path:
        return self.storage_root / f"{self.namespace}.payloads.json"

    def _ensure_loaded(self) -> None:
        if self._vectors is not None:
            return
        self.storage_root.mkdir(parents=True, exist_ok=True)
        if self._vector_path.exists() and self._payload_path.exists():
            vectors = np.load(self._vector_path)
            payloads = json.loads(self._payload_path.read_text(encoding="utf-8"))
            if len(payloads) == len(vectors):
                self._vectors = np.asarray(vectors, dtype=np.float32)
                self._payloads = payloads
                return
            logger.warning("Vector store files are out of sync; starting empty. Run `manage.py reindex`.")
        self._vectors = np.zeros((0, 0), dtype=np.float32)
        self._payloads = []

    def _save(self) -> None:
        assert self._vectors is not None
        np.save(self._vector_path, self._vectors.astype(np.float32))
        tmp = self._payload_path.with_suffix(".tmp")
        tmp.write_text(json.dumps(self._payloads, ensure_ascii=False), encoding="utf-8")
        tmp.replace(self._payload_path)

    def reload(self) -> None:
        with self._lock:
            self._vectors = None
            self._ensure_loaded()

    def count(self) -> int:
        with self._lock:
            self._ensure_loaded()
            return len(self._payloads)

    def clear(self) -> None:
        with self._lock:
            self._vectors = np.zeros((0, 0), dtype=np.float32)
            self._payloads = []
            self._save()

    def remove_entity(self, entity_type: str, entity_id: int, *, save: bool = True) -> int:
        with self._lock:
            self._ensure_loaded()
            target = (entity_type, int(entity_id))
            keep = [i for i, payload in enumerate(self._payloads) if entity_key(payload) != target]
            removed = len(self._payloads) - len(keep)
            if removed:
                self._payloads = [self._payloads[i] for i in keep]
                self._vectors = self._vectors[keep] if keep else np.zeros((0, 0), dtype=np.float32)
                if save:
                    self._save()
            return removed

    def replace_entity(self, entity_type: str, entity_id: int, vectors: np.ndarray, payloads: list[dict[str, Any]]) -> None:
        vectors = np.asarray(vectors, dtype=np.float32)
        with self._lock:
            self.remove_entity(entity_type, entity_id, save=False)
            if len(payloads):
                if self._vectors.size == 0:
                    self._vectors = vectors
                elif self._vectors.shape[1] != vectors.shape[1]:
                    raise ValueError(
                        f"Embedding size changed ({self._vectors.shape[1]} -> {vectors.shape[1]}). Run `manage.py reindex`."
                    )
                else:
                    self._vectors = np.vstack([self._vectors, vectors])
                self._payloads.extend(payloads)
            self._save()

    def search(self, query_vector: np.ndarray, allowed: set[EntityKey], top_k: int) -> list[dict[str, Any]]:
        with self._lock:
            self._ensure_loaded()
            if not allowed or self._vectors.size == 0:
                return []
            indices = [i for i, payload in enumerate(self._payloads) if entity_key(payload) in allowed]
            if not indices:
                return []
            subset = self._vectors[indices]
            payloads = [self._payloads[i] for i in indices]

        query = np.asarray(query_vector, dtype=np.float32).reshape(1, -1)
        if query.shape[1] != subset.shape[1]:
            logger.warning("Query embedding size does not match the index. Run `manage.py reindex`.")
            return []
        limit = min(top_k, len(payloads))
        try:
            import faiss

            index = faiss.IndexFlatIP(subset.shape[1])
            index.add(subset)
            scores, order = index.search(query, limit)
            pairs = [(int(i), float(s)) for i, s in zip(order[0], scores[0]) if i >= 0]
        except Exception:
            similarities = (subset @ query.T)[:, 0]
            top = np.argsort(similarities)[::-1][:limit]
            pairs = [(int(i), float(similarities[i])) for i in top]

        return [{**payloads[i], "score": score} for i, score in pairs]


vector_store = VectorStore()
