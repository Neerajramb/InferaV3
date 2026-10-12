from datetime import timedelta

from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import User

PRESENCE_WRITE_INTERVAL = timedelta(seconds=60)


class PresenceJWTAuthentication(JWTAuthentication):
    """JWT auth that also records presence, at most once a minute per user."""

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is not None:
            user, _ = result
            now = timezone.now()
            if not user.last_seen or now - user.last_seen > PRESENCE_WRITE_INTERVAL:
                User.objects.filter(pk=user.pk).update(last_seen=now)
                user.last_seen = now
        return result
