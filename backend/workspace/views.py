from __future__ import annotations

import json
import logging
import mimetypes
import time
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Count, Max, Q
from django.db.models.functions import TruncDate
from django.http import FileResponse, StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.roles import can_create_projects, can_view_all_logs, can_view_team_admin, is_founder
from accounts.serializers import UserSerializer
from utils.faiss_store import vector_store
from utils.llm import provider_status, stream_answer
from utils.rag_pipeline import (
    Scope,
    build_messages,
    retrieve,
    schedule_document_index,
    schedule_note_index,
    source_list,
)
from utils.text_extractor import SUPPORTED_EXTENSIONS

from .access import (
    can_contribute,
    can_delete_document,
    can_edit_folder,
    can_edit_note,
    can_manage_project,
    visible_documents,
    visible_folders,
    visible_notes,
    visible_project_ids,
    visible_projects,
    visible_sessions,
)
from .audit import audit
from .models import ChatMessage, ChatSession, Document, Folder, IndexStatus, Log, Message, Project, ProjectMember, Query
from .serializers import (
    ChatMessageSerializer,
    ChatRequestSerializer,
    ChatSessionDetailSerializer,
    ChatSessionSerializer,
    DirectMessageSerializer,
    DocumentSerializer,
    DocumentUpdateSerializer,
    FolderSerializer,
    FolderTreeSerializer,
    LogSerializer,
    NoteSerializer,
    ProjectSerializer,
)

User = get_user_model()
logger = logging.getLogger("infera.chat")


# --- Helpers --------------------------------------------------------------------


def filter_by_space(queryset, request, project_field: str = "project", owner_field: str | None = None):
    """Apply ?space=personal|<project id>. Anything else returns all visible items.

    The personal space only ever holds the requester's own items, even for the
    Founder, who can otherwise open everyone's files.
    """
    space = request.query_params.get("space")
    if space == "personal":
        queryset = queryset.filter(**{f"{project_field}__isnull": True})
        return queryset.filter(**{owner_field: request.user}) if owner_field else queryset
    if space and space.isdigit():
        if int(space) not in visible_project_ids(request.user):
            raise NotFound("Project not found.")
        return queryset.filter(**{f"{project_field}_id": int(space)})
    return queryset


def resolve_project(user, project_id) -> Project | None:
    if project_id in (None, "", "personal", "null"):
        return None
    try:
        return visible_projects(user).get(pk=int(project_id))
    except (Project.DoesNotExist, ValueError, TypeError):
        raise ValidationError({"project": "Project not found."})


def resolve_folder(user, folder_id, project: Project | None) -> Folder | None:
    if folder_id in (None, "", "null"):
        return None
    try:
        folder = visible_folders(user).get(pk=int(folder_id))
    except (Folder.DoesNotExist, ValueError, TypeError):
        raise ValidationError({"folder": "Folder not found."})
    if folder.project_id != (project.id if project else None):
        raise ValidationError({"folder": "That folder belongs to a different space."})
    return folder


# --- Dashboard & system -----------------------------------------------------------


class DashboardView(APIView):
    def get(self, request):
        user = request.user
        documents = visible_documents(user)
        queries = Query.objects.all() if is_founder(user) else Query.objects.filter(user=user)
        since = timezone.now() - timedelta(days=13)
        per_day = {
            row["day"]: row["count"]
            for row in queries.filter(created_at__date__gte=since.date())
            .annotate(day=TruncDate("created_at"))
            .order_by()
            .values("day")
            .annotate(count=Count("id"))
        }
        series = []
        for offset in range(14):
            day = (since + timedelta(days=offset)).date()
            series.append({"date": day.isoformat(), "count": per_day.get(day, 0)})

        index = {state: 0 for state in IndexStatus.values}
        for row in documents.order_by().values("status").annotate(count=Count("id")):
            index[row["status"]] = row["count"]

        activity = Log.objects.select_related("user")
        if not can_view_all_logs(user):
            activity = activity.filter(user=user)

        return Response({
            "user": UserSerializer(user).data,
            "stats": {
                "projects": visible_projects(user).count(),
                "documents": documents.count(),
                "notes": visible_notes(user).count(),
                "queries": queries.count(),
                "team": User.objects.filter(is_active=True).count() if can_view_team_admin(user) else None,
            },
            "index": index,
            "query_series": series,
            "recent_activity": LogSerializer(activity[:8], many=True).data,
            "recent_documents": DocumentSerializer(
                documents.select_related("uploaded_by", "project")[:5], many=True, context={"request": request}
            ).data,
            "recent_sessions": ChatSessionSerializer(
                visible_sessions(user).annotate(message_count=Count("messages")).order_by("-updated_at")[:4], many=True
            ).data,
            "assistant": provider_status().as_dict(),
        })


class SystemStatusView(APIView):
    def get(self, request):
        force = request.query_params.get("refresh") == "1"
        return Response({
            "assistant": provider_status(force=force).as_dict(),
            "embeddings": {"backend": settings.EMBEDDING_BACKEND, "model": settings.EMBEDDING_MODEL_NAME},
            "index": {"chunks": vector_store.count()},
            "upload": {"max_mb": settings.MAX_UPLOAD_MB, "extensions": sorted(SUPPORTED_EXTENSIONS)},
        })


class SearchView(APIView):
    """Semantic search across everything the user can read."""

    def get(self, request):
        query = (request.query_params.get("q") or "").strip()
        if len(query) < 2:
            return Response([])
        hits = retrieve(request.user, query, Scope(), top_k=8)
        return Response(source_list(hits))


# --- Projects ---------------------------------------------------------------------


def annotated_projects(user):
    return (
        visible_projects(user)
        .select_related("owner")
        .prefetch_related("memberships__user")
        .annotate(
            document_count=Count("documents", distinct=True),
            note_count=Count("notes", distinct=True),
        )
    )


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return annotated_projects(self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        user = self.request.user
        if not can_create_projects(user):
            raise PermissionDenied("Only the Founder and PMs can create projects.")
        member_ids = set(serializer.validated_data.pop("member_ids", []))
        project = serializer.save(owner=user, created_by=user)
        ProjectMember.objects.create(project=project, user=user, role=ProjectMember.MemberRole.OWNER)
        for member in User.objects.filter(id__in=member_ids - {user.id}, is_active=True):
            ProjectMember.objects.create(project=project, user=member, role=ProjectMember.MemberRole.EDITOR)
        audit(user, "project_created", project=project.name, project_id=project.id)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        project = annotated_projects(request.user).get(pk=serializer.instance.pk)
        return Response(self.get_serializer(project).data, status=status.HTTP_201_CREATED)


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return annotated_projects(self.request.user)

    def check_manage(self, project):
        if not can_manage_project(self.request.user, project):
            raise PermissionDenied("Only the Founder or the project owner can change this project.")

    def perform_update(self, serializer):
        self.check_manage(serializer.instance)
        serializer.validated_data.pop("member_ids", None)
        project = serializer.save()
        audit(self.request.user, "project_updated", project=project.name, project_id=project.id)

    def perform_destroy(self, instance):
        self.check_manage(instance)
        audit(self.request.user, "project_deleted", project=instance.name, project_id=instance.id)
        instance.delete()


class ProjectMemberView(APIView):
    """POST adds a member; PATCH changes their role; DELETE removes them."""

    def get_project(self, request, pk) -> Project:
        project = get_object_or_404(visible_projects(request.user), pk=pk)
        if not can_manage_project(request.user, project):
            raise PermissionDenied("Only the Founder or the project owner can manage members.")
        return project

    def _role(self, request) -> str:
        role = request.data.get("role", ProjectMember.MemberRole.EDITOR)
        if role not in {ProjectMember.MemberRole.EDITOR, ProjectMember.MemberRole.VIEWER}:
            raise ValidationError({"role": "Role must be editor or viewer."})
        return role

    def post(self, request, pk):
        project = self.get_project(request, pk)
        member = get_object_or_404(User, pk=request.data.get("user_id"), is_active=True)
        membership, created = ProjectMember.objects.get_or_create(
            project=project, user=member, defaults={"role": self._role(request)}
        )
        if created:
            audit(request.user, "member_added", project=project.name, username=member.username, role=membership.role)
        project = annotated_projects(request.user).get(pk=project.pk)
        return Response(ProjectSerializer(project, context={"request": request}).data,
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def patch(self, request, pk, user_id):
        project = self.get_project(request, pk)
        membership = get_object_or_404(ProjectMember, project=project, user_id=user_id)
        if membership.user_id == project.owner_id:
            raise ValidationError("The owner's role can't be changed.")
        membership.role = self._role(request)
        membership.save(update_fields=["role"])
        audit(request.user, "member_role_changed", project=project.name, username=membership.user.username, role=membership.role)
        project = annotated_projects(request.user).get(pk=project.pk)
        return Response(ProjectSerializer(project, context={"request": request}).data)

    def delete(self, request, pk, user_id):
        project = self.get_project(request, pk)
        membership = get_object_or_404(ProjectMember, project=project, user_id=user_id)
        if membership.user_id == project.owner_id:
            raise ValidationError("The project owner can't be removed.")
        username = membership.user.username
        membership.delete()
        audit(request.user, "member_removed", project=project.name, username=username)
        return Response(status=status.HTTP_204_NO_CONTENT)


# --- Folders ----------------------------------------------------------------------


class FolderListCreateView(generics.ListCreateAPIView):
    serializer_class = FolderSerializer

    def get_queryset(self):
        return filter_by_space(visible_folders(self.request.user), self.request, owner_field="created_by")

    def perform_create(self, serializer):
        folder = serializer.save(created_by=self.request.user)
        audit(self.request.user, "folder_created", folder=folder.name, project_id=folder.project_id)


class FolderDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FolderSerializer

    def get_queryset(self):
        return visible_folders(self.request.user)

    def perform_update(self, serializer):
        if not can_edit_folder(self.request.user, serializer.instance):
            raise PermissionDenied("You can't edit this folder.")
        serializer.validated_data.pop("project", None)
        serializer.save()

    def perform_destroy(self, instance):
        if not can_edit_folder(self.request.user, instance):
            raise PermissionDenied("You can't delete this folder.")
        audit(self.request.user, "folder_deleted", folder=instance.name, project_id=instance.project_id)
        instance.delete()


class FolderTreeView(APIView):
    def get(self, request):
        user = request.user
        folders = list(filter_by_space(visible_folders(user), request, owner_field="created_by"))
        ids = [f.id for f in folders]
        children: dict[int, list[Folder]] = {}
        for folder in folders:
            if folder.parent_id in ids:
                children.setdefault(folder.parent_id, []).append(folder)
        roots = [f for f in folders if f.parent_id not in ids]
        context = {
            "children": children,
            "doc_counts": dict(
                visible_documents(user).filter(folder_id__in=ids).order_by().values_list("folder_id").annotate(c=Count("id"))
            ),
            "note_counts": dict(
                visible_notes(user).filter(folder_id__in=ids).order_by().values_list("folder_id").annotate(c=Count("id"))
            ),
        }
        return Response(FolderTreeSerializer(roots, many=True, context=context).data)


# --- Documents --------------------------------------------------------------------


class DocumentListView(generics.ListAPIView):
    serializer_class = DocumentSerializer

    def get_queryset(self):
        queryset = filter_by_space(visible_documents(self.request.user), self.request, owner_field="uploaded_by")
        params = self.request.query_params
        if "folder" in params:
            folder = params["folder"]
            if folder in ("", "root"):
                queryset = queryset.filter(folder__isnull=True)
            elif folder.isdigit():
                queryset = queryset.filter(folder_id=int(folder))
            else:
                raise ValidationError({"folder": "Folder must be a number or 'root'."})
        if params.get("q"):
            queryset = queryset.filter(title__icontains=params["q"])
        if params.get("status"):
            queryset = queryset.filter(status=params["status"])
        return queryset.select_related("uploaded_by", "project")


class DocumentUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get("file")
        if not upload:
            raise ValidationError({"file": "Choose a file to upload."})
        extension = Path(upload.name).suffix.lower()
        if extension not in SUPPORTED_EXTENSIONS:
            raise ValidationError({"file": f"{extension or 'This file type'} isn't supported. Use PDF, DOCX, TXT, Markdown or CSV."})
        if upload.size > settings.MAX_UPLOAD_MB * 1024 * 1024:
            raise ValidationError({"file": f"Files can be up to {settings.MAX_UPLOAD_MB} MB."})

        project = resolve_project(request.user, request.data.get("project"))
        if not can_contribute(request.user, project):
            raise PermissionDenied("Viewers can't upload to this project.")
        folder = resolve_folder(request.user, request.data.get("folder"), project)

        title = (request.data.get("title") or upload.name).strip()[:255]
        document = Document.objects.create(
            title=title, file=upload, file_size=upload.size, uploaded_by=request.user, project=project, folder=folder
        )
        audit(request.user, "document_uploaded", title=title, document_id=document.id, project_id=document.project_id)
        schedule_document_index(document)
        document.refresh_from_db()
        return Response(DocumentSerializer(document, context={"request": request}).data, status=status.HTTP_201_CREATED)


class DocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    def get_queryset(self):
        return visible_documents(self.request.user).select_related("uploaded_by", "project")

    def get_serializer_class(self):
        return DocumentSerializer if self.request.method == "GET" else DocumentUpdateSerializer

    def update(self, request, *args, **kwargs):
        document = self.get_object()
        if not can_delete_document(request.user, document):
            raise PermissionDenied("You can't edit this document.")
        serializer = DocumentUpdateSerializer(document, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        previous_title = document.title
        serializer.save()
        if document.title != previous_title:
            # Citations carry the title, so refresh the indexed passages.
            schedule_document_index(document)
            document.refresh_from_db()
        return Response(DocumentSerializer(document, context={"request": request}).data)

    def perform_destroy(self, instance):
        if not can_delete_document(self.request.user, instance):
            raise PermissionDenied("You can't delete this document.")
        audit(self.request.user, "document_deleted", title=instance.title, document_id=instance.id)
        instance.delete()


class DocumentDownloadView(APIView):
    def get(self, request, pk):
        document = get_object_or_404(visible_documents(request.user), pk=pk)
        if not document.file or not Path(document.file.path).exists():
            raise NotFound("The file is missing on the server.")
        content_type = mimetypes.guess_type(document.file.name)[0] or "application/octet-stream"
        filename = document.title
        extension = Path(document.file.name).suffix
        if extension and not filename.lower().endswith(extension.lower()):
            filename += extension
        return FileResponse(
            document.file.open("rb"),
            content_type=content_type,
            as_attachment=request.query_params.get("download") == "1",
            filename=filename,
        )


class DocumentReindexView(APIView):
    def post(self, request, pk):
        document = get_object_or_404(visible_documents(request.user), pk=pk)
        if not can_delete_document(request.user, document):
            raise PermissionDenied("You can't reindex this document.")
        Document.objects.filter(pk=pk).update(status=IndexStatus.PENDING, error="")
        schedule_document_index(document)
        document.refresh_from_db()
        return Response(DocumentSerializer(document, context={"request": request}).data)


# --- Notes ------------------------------------------------------------------------


class NoteListCreateView(generics.ListCreateAPIView):
    serializer_class = NoteSerializer

    def get_queryset(self):
        queryset = filter_by_space(visible_notes(self.request.user), self.request, owner_field="user").select_related("user", "project")
        if self.request.query_params.get("q"):
            q = self.request.query_params["q"]
            queryset = queryset.filter(Q(title__icontains=q) | Q(content__icontains=q))
        return queryset

    def perform_create(self, serializer):
        note = serializer.save(user=self.request.user)
        audit(self.request.user, "note_created", title=note.title, note_id=note.id)
        schedule_note_index(note)


class NoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = NoteSerializer

    def get_queryset(self):
        return visible_notes(self.request.user).select_related("user", "project")

    def perform_update(self, serializer):
        if not can_edit_note(self.request.user, serializer.instance):
            raise PermissionDenied("You can't edit this note.")
        note = serializer.save(status=IndexStatus.PENDING)
        schedule_note_index(note)

    def perform_destroy(self, instance):
        if not can_edit_note(self.request.user, instance):
            raise PermissionDenied("You can't delete this note.")
        audit(self.request.user, "note_deleted", title=instance.title, note_id=instance.id)
        instance.delete()


# --- Messaging --------------------------------------------------------------------


class ConversationListView(APIView):
    def get(self, request):
        me = request.user
        threads = (
            Message.objects.filter(Q(sender=me) | Q(receiver=me))
            .order_by()
            .values("sender_id", "receiver_id")
            .annotate(last=Max("created_at"))
        )
        latest: dict = {}
        for row in threads:
            other = row["receiver_id"] if row["sender_id"] == me.id else row["sender_id"]
            if other not in latest or row["last"] > latest[other]:
                latest[other] = row["last"]
        unread = dict(
            Message.objects.filter(receiver=me, is_read=False).order_by().values_list("sender_id").annotate(c=Count("id"))
        )
        result = []
        for other_id, _ in sorted(latest.items(), key=lambda item: item[1], reverse=True):
            last = (
                Message.objects.filter(Q(sender=me, receiver_id=other_id) | Q(sender_id=other_id, receiver=me))
                .order_by("-created_at")
                .first()
            )
            result.append({
                "user_id": other_id,
                "last_message": DirectMessageSerializer(last).data if last else None,
                "unread": unread.get(other_id, 0),
            })
        return Response(result)


class UnreadCountView(APIView):
    def get(self, request):
        return Response({"count": Message.objects.filter(receiver=request.user, is_read=False).count()})


class DirectMessageListCreateView(generics.ListCreateAPIView):
    serializer_class = DirectMessageSerializer

    def get_queryset(self):
        other = self.request.query_params.get("user_id")
        if not other or not str(other).isdigit():
            return Message.objects.none()
        me = self.request.user
        thread = Message.objects.filter(Q(sender=me, receiver_id=other) | Q(sender_id=other, receiver=me))
        return thread.order_by("created_at")

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        other = request.query_params.get("user_id")
        if other and str(other).isdigit():
            Message.objects.filter(sender_id=other, receiver=request.user, is_read=False).update(is_read=True)
        return response

    def perform_create(self, serializer):
        if serializer.validated_data["receiver"] == self.request.user:
            raise ValidationError("You can't message yourself.")
        serializer.save(sender=self.request.user)


# --- Logs -------------------------------------------------------------------------


class LogPagination(PageNumberPagination):
    page_size = 30
    page_size_query_param = "page_size"
    max_page_size = 100


class LogListView(generics.ListAPIView):
    serializer_class = LogSerializer
    pagination_class = LogPagination

    def get_queryset(self):
        user = self.request.user
        queryset = Log.objects.select_related("user")
        if not can_view_all_logs(user):
            queryset = queryset.filter(user=user)
        params = self.request.query_params
        if params.get("action"):
            queryset = queryset.filter(action=params["action"])
        if params.get("user"):
            queryset = queryset.filter(user__username=params["user"])
        if params.get("q"):
            queryset = queryset.filter(Q(action__icontains=params["q"]) | Q(user__username__icontains=params["q"]))
        return queryset.order_by("-timestamp")


class LogActionsView(APIView):
    def get(self, request):
        queryset = Log.objects.all() if can_view_all_logs(request.user) else Log.objects.filter(user=request.user)
        return Response(sorted(set(queryset.values_list("action", flat=True))))


# --- AI chat ----------------------------------------------------------------------


class ChatSessionListCreateView(generics.ListCreateAPIView):
    serializer_class = ChatSessionSerializer

    def get_queryset(self):
        # Aggregation drops Meta.ordering, so order explicitly.
        return visible_sessions(self.request.user).annotate(message_count=Count("messages")).order_by("-updated_at")

    def perform_create(self, serializer):
        project = serializer.validated_data.get("project")
        if project is not None and project.id not in visible_project_ids(self.request.user):
            raise ValidationError({"project": "Project not found."})
        serializer.save(user=self.request.user)


class ChatSessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    def get_queryset(self):
        return visible_sessions(self.request.user).annotate(message_count=Count("messages")).prefetch_related("messages")

    def get_serializer_class(self):
        return ChatSessionDetailSerializer if self.request.method == "GET" else ChatSessionSerializer

    def perform_update(self, serializer):
        project = serializer.validated_data.get("project")
        if project is not None and project.id not in visible_project_ids(self.request.user):
            raise ValidationError({"project": "Project not found."})
        serializer.save()


class ChatTurn:
    """Everything needed to answer one question inside a session."""

    def __init__(self, request):
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        self.user = request.user
        self.query: str = data["query"]

        project = None
        if data.get("project_id"):
            project = visible_projects(self.user).filter(pk=data["project_id"]).first()
            if project is None:
                raise ValidationError({"project_id": "Project not found."})

        if data.get("session_id"):
            self.session = get_object_or_404(visible_sessions(self.user), pk=data["session_id"])
        else:
            self.session = ChatSession(user=self.user, title=self.query[:60])
        self.session.project = project
        self.session.selected_folder_ids = data["folder_ids"]
        self.session.selected_document_ids = data["document_ids"]
        self.session.selected_note_ids = data["note_ids"]
        if self.session.title in ("New chat", "New Chat", ""):
            self.session.title = self.query[:60]
        self.session.save()

        self.history = [
            {"role": m.role, "content": m.content}
            for m in reversed(list(self.session.messages.order_by("-created_at")[:6]))
        ]
        self.scope = Scope(project.id if project else None, data["folder_ids"], data["document_ids"], data["note_ids"])
        self.hits = retrieve(self.user, self.query, self.scope)
        self.sources = source_list(self.hits)
        self.user_message = ChatMessage.objects.create(session=self.session, role="user", content=self.query)
        self.started = time.monotonic()

    def finish(self, answer: str, provider: str) -> ChatMessage:
        message = ChatMessage.objects.create(session=self.session, role="ai", content=answer, sources=self.sources)
        latency = int((time.monotonic() - self.started) * 1000)
        Query.objects.create(
            query_text=self.query, response_text=answer, user=self.user, project=self.session.project,
            sources=self.sources, provider=provider, latency_ms=latency,
        )
        ChatSession.objects.filter(pk=self.session.pk).update(updated_at=timezone.now())
        audit(self.user, "ai_query", session_id=self.session.id, provider=provider, sources=len(self.sources))
        return message


class ChatView(APIView):
    """Non-streaming chat, kept for simple clients."""

    def post(self, request):
        turn = ChatTurn(request)
        status_info, tokens = stream_answer(build_messages(turn.query, turn.hits, turn.history), turn.query, turn.hits)
        message = turn.finish("".join(tokens), status_info.provider)
        return Response({
            "session_id": turn.session.id,
            "title": turn.session.title,
            "message": ChatMessageSerializer(message).data,
            "response": message.content,
            "sources": turn.sources,
            "assistant": status_info.as_dict(),
        })


def sse(event: str, data) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


class ChatStreamView(APIView):
    """Server-sent events: meta, then token*, then done (or error)."""

    def post(self, request):
        turn = ChatTurn(request)
        status_info, tokens = stream_answer(build_messages(turn.query, turn.hits, turn.history), turn.query, turn.hits)

        def events():
            yield sse("meta", {
                "session_id": turn.session.id,
                "title": turn.session.title,
                "user_message": ChatMessageSerializer(turn.user_message).data,
                "sources": turn.sources,
                "assistant": status_info.as_dict(),
            })
            parts: list[str] = []
            finished = False
            try:
                for token in tokens:
                    parts.append(token)
                    yield sse("token", {"t": token})
                message = turn.finish("".join(parts), status_info.provider)
                finished = True
                yield sse("done", {"message": ChatMessageSerializer(message).data})
            except Exception:  # pragma: no cover - network failures
                logger.exception("Chat stream failed for session %s", turn.session.id)
                yield sse("error", {"detail": "The answer was interrupted. Please try again."})
            finally:
                # Keep partial answers if the client disconnects mid-stream.
                if not finished and parts:
                    turn.finish("".join(parts), status_info.provider)

        response = StreamingHttpResponse(events(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response

