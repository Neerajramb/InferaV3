from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    class Roles(models.TextChoices):
        FOUNDER = "Founder", "Founder"
        HR = "HR", "HR"
        PM = "PM", "PM"
        EMPLOYEE = "Employee", "Employee"

    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.EMPLOYEE)
    last_seen = models.DateTimeField(default=timezone.now)

    def __str__(self) -> str:
        return f"{self.username} ({self.role})"
