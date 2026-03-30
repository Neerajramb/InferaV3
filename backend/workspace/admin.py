from django.contrib import admin

from .models import Document, Log, Project, Query


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "owner", "created_at")
    search_fields = ("name", "description", "owner__username")


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "project", "uploaded_by", "chunk_count", "indexed_at", "created_at")
    search_fields = ("title", "uploaded_by__username")
    list_filter = ("project", "created_at")


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
