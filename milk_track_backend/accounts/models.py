from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrator'
        COLLECTION_WORKER = 'COLLECTION_WORKER', 'Collection Worker'
        DISTRIBUTION_WORKER = 'DISTRIBUTION_WORKER', 'Distribution Worker'
        ACCOUNTANT = 'ACCOUNTANT', 'Accountant'

    role = models.CharField(max_length=50, choices=Role.choices, default=Role.ADMIN)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
