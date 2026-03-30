from __future__ import annotations

import hashlib
from typing import Iterable

import numpy as np
from django.conf import settings


class EmbeddingService:
    def __init__(self):
        self._model = None
        self._dim = 384

    def _load_model(self):
        if self._model is not None:
            return self._model
        try:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
            sample = self._model.encode(["health-check"], normalize_embeddings=True)
            self._dim = int(sample.shape[1])
        except Exception:
            self._model = None
        return self._model

    @property
    def dimension(self) -> int:
        self._load_model()
        return self._dim

    def _fallback_embed(self, text: str) -> np.ndarray:
        vector = np.zeros(self._dim, dtype=np.float32)
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        for index in range(self._dim):
            vector[index] = digest[index % len(digest)] / 255.0
        norm = np.linalg.norm(vector)
        return vector if norm == 0 else vector / norm

    def embed_text(self, text: str) -> np.ndarray:
        model = self._load_model()
        if model is None:
            return self._fallback_embed(text)
        return np.asarray(model.encode(text, normalize_embeddings=True), dtype=np.float32)

    def embed_texts(self, texts: Iterable[str]) -> np.ndarray:
        text_list = list(texts)
        if not text_list:
            return np.zeros((0, self.dimension), dtype=np.float32)
        model = self._load_model()
        if model is None:
            return np.vstack([self._fallback_embed(text) for text in text_list]).astype(np.float32)
        return np.asarray(model.encode(text_list, normalize_embeddings=True), dtype=np.float32)


embedding_service = EmbeddingService()
