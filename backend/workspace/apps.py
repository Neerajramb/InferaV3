import os
import sys
import threading

from django.apps import AppConfig


def _should_warm_up() -> bool:
    from django.conf import settings

    if settings.TESTING or settings.EMBEDDING_BACKEND == "hash":
        return False
    argv = " ".join(sys.argv)
    if "runserver" in argv:
        # Only in the process that serves requests, not the autoreloader parent.
        return os.environ.get("RUN_MAIN") == "true" or "--noreload" in argv
    return "manage.py" not in argv  # gunicorn / uwsgi


class WorkspaceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "workspace"

    def ready(self):
        from . import signals  # noqa: F401

        if _should_warm_up():
            from utils.embedding import embedding_service

            # Load the embedding model before the first upload or question needs it.
            threading.Thread(target=lambda: embedding_service.dimension, daemon=True, name="infera-warmup").start()
