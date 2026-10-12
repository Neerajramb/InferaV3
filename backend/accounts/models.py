from datetime import timedelta

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


ONLINE_WINDOW = timedelta(minutes=5)


class User(AbstractUser):
    class Roles(models.TextChoices):
        FOUNDER = "Founder", "Founder"
        HR = "HR", "HR"
        PM = "PM", "PM"
        EMPLOYEE = "Employee", "Employee"

    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.EMPLOYEE)
    last_seen = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        self.role = normalize_role(self.role)
        # Accounts made with `createsuperuser` should own the workspace.
        if self._state.adding and self.is_superuser and self.role == self.Roles.EMPLOYEE:
            self.role = self.Roles.FOUNDER
        super().save(*args, **kwargs)

    @property
    def display_name(self) -> str:
        full = f"{self.first_name} {self.last_name}".strip()
        return full or self.username

    @property
    def is_online(self) -> bool:
        return bool(self.last_seen and self.last_seen >= timezone.now() - ONLINE_WINDOW)

    def __str__(self) -> str:
        return f"{self.username} ({self.role})"


def normalize_role(value: str | None) -> str:
    """Map any casing of a role name onto its canonical value."""
    lookup = {choice.lower(): choice for choice in User.Roles.values}
    return lookup.get(str(value or "").strip().lower(), User.Roles.EMPLOYEE)
