from rest_framework import serializers

from .models import Document, Log, Project, Query


class ProjectSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)

    class Meta:
        model = Project
        fields = ("id", "name", "description", "owner", "owner_username", "created_at")
        read_only_fields = ("id", "owner", "owner_username", "created_at")


class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by_username = serializers.CharField(source="uploaded_by.username", read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = (
            "id",
            "project",
            "title",
            "file",
            "file_url",
            "uploaded_by",
            "uploaded_by_username",
            "created_at",
            "chunk_count",
            "indexed_at",
        )
        read_only_fields = ("id", "uploaded_by", "uploaded_by_username", "created_at", "chunk_count", "indexed_at", "file_url")

    def get_file_url(self, obj):
        request = self.context.get("request")
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else ""


class DocumentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ("id", "title", "file", "project", "created_at")
        read_only_fields = ("id", "created_at")

    def validate_file(self, value):
        allowed_extensions = {".pdf", ".txt", ".docx"}
        suffix = ""
        if hasattr(value, "name") and "." in value.name:
            suffix = value.name[value.name.rfind(".") :].lower()
        if suffix not in allowed_extensions:
            raise serializers.ValidationError("Only PDF, TXT, and DOCX files are supported.")
        return value


class QuerySerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Query
        fields = ("id", "query_text", "response_text", "user", "user_username", "project", "created_at", "sources")
        read_only_fields = ("id", "user", "user_username", "created_at", "sources")


class LogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Log
        fields = ("id", "action", "username", "timestamp", "metadata")


class ChatRequestSerializer(serializers.Serializer):
    query = serializers.CharField()
    project_id = serializers.IntegerField(required=False)
