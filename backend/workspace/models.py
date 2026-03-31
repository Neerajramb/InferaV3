from django.conf import settings
from django.db import models


class Project(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="owned_projects")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_projects",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return self.name


class Folder(models.Model):
    name = models.CharField(max_length=255)
    parent = models.ForeignKey("self", on_delete=models.CASCADE, related_name="children", null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="folders")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="folders", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("name",)
        unique_together = ("parent", "name", "project", "created_by")

    def __str__(self) -> str:
        return self.name


class Document(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="documents", null=True, blank=True)
    folder = models.ForeignKey(Folder, on_delete=models.SET_NULL, related_name="documents", null=True, blank=True)
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to="documents/")
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="uploaded_documents")
    created_at = models.DateTimeField(auto_now_add=True)
    chunk_count = models.PositiveIntegerField(default=0)
    indexed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return self.title


class Note(models.Model):
    title = models.CharField(max_length=255)
    content = models.TextField()
    folder = models.ForeignKey(Folder, on_delete=models.SET_NULL, related_name="notes", null=True, blank=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="notes", null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notes")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    chunk_count = models.PositiveIntegerField(default=0)
    indexed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-updated_at",)

    def __str__(self) -> str:
        return self.title


class ProjectMember(models.Model):
    class MemberRole(models.TextChoices):
        OWNER = "owner", "Owner"
        EDITOR = "editor", "Editor"
        VIEWER = "viewer", "Viewer"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="project_memberships")
    role = models.CharField(max_length=20, choices=MemberRole.choices, default=MemberRole.VIEWER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("project", "user")
        unique_together = ("project", "user")

    def __str__(self) -> str:
        return f"{self.user} -> {self.project} ({self.role})"


class Query(models.Model):
    query_text = models.TextField()
    response_text = models.TextField()
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="queries")
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name="queries")
    created_at = models.DateTimeField(auto_now_add=True)
    sources = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ("-created_at",)


class Log(models.Model):
    action = models.CharField(max_length=255)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="logs")
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("-timestamp",)

    def __str__(self) -> str:
        return f"{self.action} @ {self.timestamp.isoformat()}"


class ChatSession(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_sessions")
    title = models.CharField(max_length=255, default="New Chat")
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, related_name="chat_sessions", null=True, blank=True)
    selected_folder_ids = models.JSONField(default=list, blank=True)
    selected_document_ids = models.JSONField(default=list, blank=True)
    selected_note_ids = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)

    def __str__(self) -> str:
        return f"{self.user} - {self.title}"


class ChatMessage(models.Model):
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=10)
    content = models.TextField()
    sources = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)


class Message(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages")
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_messages")
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)

    def __str__(self) -> str:
        return f"{self.sender} -> {self.receiver}"
