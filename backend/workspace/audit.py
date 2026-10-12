import logging

logger = logging.getLogger("infera.audit")


def audit(user, action: str, **metadata) -> None:
    """Record an audit log entry. Never let logging break the request."""
    from .models import Log

    try:
        Log.objects.create(user=user if user and user.is_authenticated else None, action=action, metadata=metadata)
    except Exception:  # pragma: no cover - defensive
        logger.exception("Failed to write audit log for %s", action)
