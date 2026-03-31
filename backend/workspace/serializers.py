from django.contrib.auth import get_user_model
from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta

from .models import (
    ChatMessage, ChatSession, Document, Folder, 
    Log, Message, Note, Project, ProjectMember, Query
)

User = get_user_model()

class UserSummarySerializer(serializers.ModelSerializer):
    online = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ("id", "username", "email", "role", "last_seen", "online")
    def get_online(self, obj):
        if not obj.last_seen: return False
        return obj.last_seen >= timezone.now() - timedelta(minutes=5)

class ProjectMemberSerializer(serializers.ModelSerializer):
    user = UserSummarySerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(source="user", queryset=User.objects.all(), write_only=True)
    class Meta:
        model = ProjectMember
        fields = ("id", "user", "user_id", "role", "joined_at")
        read_only_fields = ("id", "joined_at")

class ProjectSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    member_count = serializers.SerializerMethodField()
    members = ProjectMemberSerializer(source="memberships", many=True, read_only=True)

    class Meta:
        model = Project
        fields = ("id", "name", "description", "owner", "owner_username", "member_count", "members", "created_at")
        read_only_fields = ("id", "owner", "created_at")

    def get_member_count(self, obj):
        return obj.memberships.count()

class FolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Folder
        fields = ("id", "name", "parent", "project", "created_by", "created_at")
        read_only_fields = ("id", "created_by", "created_at")

class FolderTreeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    documents_count = serializers.SerializerMethodField()
    notes_count = serializers.SerializerMethodField()
    class Meta:
        model = Folder
        fields = ("id", "name", "parent", "project", "created_at", "documents_count", "notes_count", "children")
    def get_children(self, obj): return FolderTreeSerializer(obj.children.all(), many=True).data
    def get_documents_count(self, obj): return obj.documents.count()
    def get_notes_count(self, obj): return obj.notes.count()

class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by_username = serializers.CharField(source="uploaded_by.username", read_only=True)
    class Meta:
        model = Document
        fields = ("id", "project", "folder", "title", "file", "uploaded_by", "uploaded_by_username", "created_at")
        read_only_fields = ("id", "uploaded_by", "created_at")

class NoteSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True)
    class Meta:
        model = Note
        fields = ("id", "title", "content", "folder", "project", "user", "user_username", "created_at")
        read_only_fields = ("id", "user", "created_at")

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

class ChatMessageSerializer(serializers.ModelSerializer):
    text = serializers.CharField(source="content")
    class Meta:
        model = ChatMessage
        fields = ("id", "role", "text", "sources", "timestamp")

class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    class Meta:
        model = ChatSession
        fields = ("id", "title", "project", "messages", "updated_at")

class ChatRequestSerializer(serializers.Serializer):
    query = serializers.CharField()
    project_id = serializers.IntegerField(required=False, allow_null=True)
    session_id = serializers.IntegerField(required=False, allow_null=True)

class DirectMessageSerializer(serializers.ModelSerializer):
    sender = UserSummarySerializer(read_only=True)
    receiver = UserSummarySerializer(read_only=True)
    receiver_id = serializers.PrimaryKeyRelatedField(source="receiver", queryset=User.objects.all(), write_only=True)
    class Meta:
        model = Message
        fields = ("id", "sender", "receiver", "receiver_id", "content", "is_read", "created_at")

class TeamMemberSerializer(serializers.ModelSerializer):
    online = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ("id", "username", "email", "role", "last_seen", "online")
    def get_online(self, obj):
        if not obj.last_seen: return False
        return obj.last_seen >= timezone.now() - timedelta(minutes=5)