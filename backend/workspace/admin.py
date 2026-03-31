from django.contrib import admin

from .models import ChatMessage, ChatSession, Document, Folder, Log, Message, Note, Project, ProjectMember, Query


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "owner", "created_by", "created_at")
    search_fields = ("name", "description", "owner__username")


@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = ("id", "project", "user", "role", "joined_at")
    list_filter = ("role",)
    search_fields = ("project__name", "user__username")


@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "project", "parent", "created_by", "created_at")
    search_fields = ("name", "project__name", "created_by__username")


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "project", "folder", "uploaded_by", "chunk_count", "indexed_at", "created_at")
    search_fields = ("title", "uploaded_by__username")
    list_filter = ("project", "created_at")


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "project", "folder", "user", "chunk_count", "indexed_at", "updated_at")
    search_fields = ("title", "content", "user__username")
    list_filter = ("project", "updated_at")


@admin.register(Query)
class QueryAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "project", "created_at")
    search_fields = ("query_text", "response_text", "user__username")
    list_filter = ("created_at",)


@admin.register(Log)
class LogAdmin(admin.ModelAdmin):
    list_display = ("id", "action", "user", "timestamp")
    search_fields = ("action", "user__username")
    list_filter = ("timestamp",)


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "title", "project", "updated_at", "created_at")
    search_fields = ("title", "user__username")


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "role", "created_at")
    search_fields = ("content", "session__title", "session__user__username")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "sender", "receiver", "is_read", "created_at")
    search_fields = ("content", "sender__username", "receiver__username")
