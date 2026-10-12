from __future__ import annotations

import hashlib
import logging
import re
import threading
from typing import Iterable

import numpy as np
from django.conf import settings

logger = logging.getLogger("infera.embedding")

TOKEN_RE = re.compile(r"[a-z0-9]+")
HASH_DIM = 384


def tokenize(text: str) -> list[str]:
    return TOKEN_RE.findall(text.lower())


class EmbeddingService:
    """Sentence-transformer embeddings with an offline hashed fallback.

    The fallback is a signed feature-hashing bag of words (unigrams and
    bigrams). It is far weaker than a real model but still ranks chunks by
    shared vocabulary, so retrieval keeps working without the model.
    """

    def __init__(self):
        self._model = None
        self._model_failed = False
        self._dim = HASH_DIM
        self._lock = threading.Lock()

    @property
    def backend(self) -> str:
        return "sentence-transformers" if self._load_model() is not None else "hash"

    @property
    def model_name(self) -> str:
        return settings.EMBEDDING_MODEL_NAME if self.backend == "sentence-transformers" else "hashed-bag-of-words"

    def _load_model(self):
        if settings.EMBEDDING_BACKEND == "hash" or self._model_failed:
            return None
        if self._model is not None:
            return self._model
        with self._lock:
            if self._model is None and not self._model_failed:
                try:
                    from sentence_transformers import SentenceTransformer

                    model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
                    self._dim = int(model.get_sentence_embedding_dimension() or HASH_DIM)
                    self._model = model
                    logger.info("Loaded embedding model %s (%d dims)", settings.EMBEDDING_MODEL_NAME, self._dim)
                except Exception:
                    self._model_failed = True
                    logger.warning("Embedding model unavailable, using hashed fallback", exc_info=True)
        return self._model

    @property
    def dimension(self) -> int:
        self._load_model()
        return self._dim

    @staticmethod
    def _hash_embed(text: str) -> np.ndarray:
        vector = np.zeros(HASH_DIM, dtype=np.float32)
        tokens = tokenize(text)
        features = tokens + [f"{a}_{b}" for a, b in zip(tokens, tokens[1:])]
        for feature in features:
            digest = hashlib.blake2b(feature.encode("utf-8"), digest_size=8).digest()
            value = int.from_bytes(digest, "little")
            sign = 1.0 if value & 1 else -1.0
            vector[(value >> 1) % HASH_DIM] += sign
        norm = np.linalg.norm(vector)
        return vector if norm == 0 else vector / norm

    def embed_texts(self, texts: Iterable[str]) -> np.ndarray:
        text_list = list(texts)
        model = self._load_model()
        if not text_list:
            return np.zeros((0, self.dimension), dtype=np.float32)
        if model is None:
            return np.vstack([self._hash_embed(text) for text in text_list]).astype(np.float32)
        return np.asarray(model.encode(text_list, normalize_embeddings=True, batch_size=32), dtype=np.float32)

    def embed_text(self, text: str) -> np.ndarray:
        return self.embed_texts([text])[0]


embedding_service = EmbeddingService()
