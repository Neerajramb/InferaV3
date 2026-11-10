from django.contrib.auth import get_user_model
from rest_framework import serializers

from accounts.serializers import UserSerializer

from .access import can_contribute, can_delete_document, can_edit_folder, can_edit_note, can_manage_project, project_role
from .models import ChatMessage, ChatSession, Document, Folder, Log, Message, Note, Project, ProjectMember

User = get_user_model()


def _request_user(serializer):
    request = serializer.context.get("request")
    return getattr(request, "user", None)


class ProjectMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ProjectMember
        fields = ("id", "user", "role", "joined_at")


class ProjectSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    members = ProjectMemberSerializer(source="memberships", many=True, read_only=True)
    document_count = serializers.IntegerField(read_only=True, default=0)
    note_count = serializers.IntegerField(read_only=True, default=0)
    my_role = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()
    can_contribute = serializers.SerializerMethodField()
    member_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)

    class Meta:
        model = Project
        fields = (
            "id", "name", "description", "owner", "members", "document_count", "note_count",
            "my_role", "can_manage", "can_contribute", "created_at", "member_ids",
        )
        read_only_fields = ("id", "created_at")

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Give the project a name.")
        return value

    def get_my_role(self, obj):
        """The user's actual membership. Founders who are not members get None."""
        user = _request_user(self)
        if not user:
            return None
        if obj.owner_id == user.id:
            return ProjectMember.MemberRole.OWNER
        # memberships are prefetched by the views, so this does not query per project
        return next((m.role for m in obj.memberships.all() if m.user_id == user.id), None)

    def get_can_contribute(self, obj):
        user = _request_user(self)
        return bool(user and project_role(user, obj) in {ProjectMember.MemberRole.OWNER, ProjectMember.MemberRole.EDITOR})

    def get_can_manage(self, obj):
        user = _request_user(self)
        return bool(user and can_manage_project(user, obj))


class FolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Folder
        fields = ("id", "name", "parent", "project", "created_by", "created_at")
        read_only_fields = ("id", "created_by", "created_at")

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Folder name can't be empty.")
        return value

    def validate(self, attrs):
        user = _request_user(self)
        project = attrs.get("project", getattr(self.instance, "project", None))
        parent = attrs.get("parent", getattr(self.instance, "parent", None))
        if not can_contribute(user, project):
            raise serializers.ValidationError("You can't add folders to this project.")
        if parent is not None:
            if parent.project_id != (project.id if project else None):
                raise serializers.ValidationError("A subfolder must live in the same space as its parent.")
            if not can_edit_folder(user, parent):
                raise serializers.ValidationError("You can't add folders here.")
            node = parent
            while node is not None:
                if self.instance and node.pk == self.instance.pk:
                    raise serializers.ValidationError("A folder can't be moved inside itself.")
                node = node.parent
        name = attrs.get("name", getattr(self.instance, "name", ""))
        siblings = Folder.objects.filter(parent=parent, project=project, name__iexact=name)
        if project is None:
            siblings = siblings.filter(created_by=user)
        if self.instance is not None:
            siblings = siblings.exclude(pk=self.instance.pk)
        if siblings.exists():
            raise serializers.ValidationError({"name": "A folder with that name already exists here."})
        return attrs


class FolderTreeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    documents_count = serializers.SerializerMethodField()
    notes_count = serializers.SerializerMethodField()

    class Meta:
        model = Folder
        fields = ("id", "name", "parent", "project", "created_at", "documents_count", "notes_count", "children")

    def get_children(self, obj):
        children = self.context["children"].get(obj.id, [])
        return FolderTreeSerializer(children, many=True, context=self.context).data

    def get_documents_count(self, obj):
        return self.context["doc_counts"].get(obj.id, 0)

    def get_notes_count(self, obj):
        return self.context["note_counts"].get(obj.id, 0)


class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    extension = serializers.CharField(read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True, default=None)
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = (
            "id", "title", "extension", "file_size", "project", "project_name", "folder", "uploaded_by",
            "status", "error", "chunk_count", "indexed_at", "created_at", "can_delete",
        )
        read_only_fields = fields

    def get_can_delete(self, obj):
        user = _request_user(self)
        return bool(user and can_delete_document(user, obj))


class DocumentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ("title", "folder")

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Give the document a name.")
        return value

    def validate_folder(self, folder):
        if folder is None:
            return folder
        if folder.project_id != self.instance.project_id:
            raise serializers.ValidationError("That folder belongs to a different space.")
        user = _request_user(self)
        if user is None or not can_edit_folder(user, folder):
            raise serializers.ValidationError("You can't move files into that folder.")
        return folder


class NoteSerializer(serializers.ModelSerializer):
    author = UserSerializer(source="user", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True, default=None)
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = (
            "id", "title", "content", "folder", "project", "project_name", "author", "status",
            "chunk_count", "created_at", "updated_at", "can_edit",
        )
        read_only_fields = ("id", "author", "status", "chunk_count", "created_at", "updated_at")

    def get_can_edit(self, obj):
        user = _request_user(self)
        return bool(user and can_edit_note(user, obj))

    def validate(self, attrs):
        user = _request_user(self)
        project = attrs.get("project", getattr(self.instance, "project", None))
        folder = attrs.get("folder", getattr(self.instance, "folder", None))
        if self.instance is None and not can_contribute(user, project):
            raise serializers.ValidationError("You can't add notes to this project.")
        if self.instance is not None and "project" in attrs and attrs["project"] != self.instance.project:
            raise serializers.ValidationError("Notes can't move between spaces.")
        if folder is not None and folder.project_id != (project.id if project else None):
            raise serializers.ValidationError("That folder belongs to a different space.")
        if "folder" in attrs and folder is not None and not can_edit_folder(user, folder):
            raise serializers.ValidationError("You can't add notes to that folder.")
        if not (attrs.get("content", getattr(self.instance, "content", "")) or "").strip():
            raise serializers.ValidationError({"content": "Write something before saving."})
        return attrs


class LogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True, default=None)
    display_name = serializers.CharField(source="user.display_name", read_only=True, default=None)
    role = serializers.CharField(source="user.role", read_only=True, default=None)

    class Meta:
        model = Log
        fields = ("id", "action", "username", "display_name", "role", "timestamp", "metadata")


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ("id", "role", "content", "sources", "created_at")


class ChatSessionSerializer(serializers.ModelSerializer):
    message_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = ChatSession
        fields = (
            "id", "title", "project", "selected_folder_ids", "selected_document_ids", "selected_note_ids",
            "message_count", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class ChatSessionDetailSerializer(ChatSessionSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta(ChatSessionSerializer.Meta):
        fields = (*ChatSessionSerializer.Meta.fields, "messages")


class ChatRequestSerializer(serializers.Serializer):
    query = serializers.CharField(max_length=4000, trim_whitespace=True)
    session_id = serializers.IntegerField(required=False, allow_null=True)
    project_id = serializers.IntegerField(required=False, allow_null=True)
    folder_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    document_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    note_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)


class DirectMessageSerializer(serializers.ModelSerializer):
    receiver_id = serializers.PrimaryKeyRelatedField(
        source="receiver", queryset=User.objects.filter(is_active=True), write_only=True
    )
    sender_id = serializers.IntegerField(read_only=True)
    content = serializers.CharField(max_length=5000, trim_whitespace=True)

    class Meta:
        model = Message
        fields = ("id", "sender_id", "receiver_id", "content", "is_read", "created_at")
        read_only_fields = ("id", "sender_id", "is_read", "created_at")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["receiver_id"] = instance.receiver_id
        return data
