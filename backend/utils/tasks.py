from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Callable

from django.conf import settings
from django.db import close_old_connections

logger = logging.getLogger("infera.tasks")

# One worker: indexing is CPU-bound and SQLite prefers a single writer.
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="infera-index")


def _run(fn: Callable, *args) -> None:
    try:
        fn(*args)
    except Exception:
        logger.exception("Background task %s failed", getattr(fn, "__name__", fn))
    finally:
        close_old_connections()


def run_task(fn: Callable, *args) -> None:
    """Run `fn` on the indexing worker, or inline when async indexing is off."""
    if settings.RAG_ASYNC_INDEXING:
        _executor.submit(_run, fn, *args)
    else:
        fn(*args)
