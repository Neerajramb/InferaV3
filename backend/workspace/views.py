from django.db.models import QuerySet
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from utils.rag_pipeline import answer_query, delete_document_from_index, process_uploaded_document

from .models import Document, Log, Project, Query
from .permissions import ChatPermission, DocumentPermission, LogPermission, ProjectPermission
from .serializers import (
    ChatRequestSerializer,
    DocumentSerializer,
    DocumentUploadSerializer,
    LogSerializer,
    ProjectSerializer,
    QuerySerializer,
)


def create_log(action: str, user, metadata=None):
    Log.objects.create(action=action, user=user, metadata=metadata or {})


def project_queryset_for_user(user) -> QuerySet[Project]:
    if user.role == User.Roles.FOUNDER:
        return Project.objects.all()
    if user.role == User.Roles.PM:
        return Project.objects.filter(owner=user)
    return Project.objects.none()


def document_queryset_for_user(user) -> QuerySet[Document]:
    if user.role in {User.Roles.FOUNDER, User.Roles.HR, User.Roles.PM}:
        return Document.objects.select_related("project", "uploaded_by").all()
    return Document.objects.select_related("project", "uploaded_by").filter(uploaded_by=user)


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [ProjectPermission]

    def get_queryset(self):
        return project_queryset_for_user(self.request.user)

    def perform_create(self, serializer):
        project = serializer.save(owner=self.request.user)
        create_log("project_created", self.request.user, {"project_id": project.id, "project_name": project.name})


class ProjectDeleteView(generics.DestroyAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [ProjectPermission]

    def get_queryset(self):
        return project_queryset_for_user(self.request.user)

    def perform_destroy(self, instance):
        create_log("project_deleted", self.request.user, {"project_id": instance.id, "project_name": instance.name})
        instance.delete()


class DocumentListView(generics.ListAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [DocumentPermission]

    def get_queryset(self):
        return document_queryset_for_user(self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


class DocumentUploadView(generics.CreateAPIView):
    serializer_class = DocumentUploadSerializer
    permission_classes = [permissions.IsAuthenticated]  # ✅ TEMP FIX
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        document = serializer.save(uploaded_by=self.request.user)
        chunk_count = process_uploaded_document(document)
        create_log(
            "document_uploaded",
            self.request.user,
            {"document_id": document.id, "title": document.title, "chunk_count": chunk_count},
        )

class DocumentDeleteView(generics.DestroyAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [DocumentPermission]

    def get_queryset(self):
        return document_queryset_for_user(self.request.user)

    def perform_destroy(self, instance):
        document_id = instance.id
        title = instance.title
        delete_document_from_index(instance)
        if instance.file:
            instance.file.delete(save=False)
        instance.delete()
        create_log("document_deleted", self.request.user, {"document_id": document_id, "title": title})


class QueryListView(generics.ListAPIView):
    serializer_class = QuerySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == User.Roles.FOUNDER:
            return Query.objects.select_related("user", "project").all()
        return Query.objects.select_related("user", "project").filter(user=self.request.user)


class LogListView(generics.ListAPIView):
    serializer_class = LogSerializer
    permission_classes = [LogPermission]
    queryset = Log.objects.select_related("user").all()


class ChatView(APIView):
    permission_classes = [ChatPermission]

    def post(self, request):
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project = None
        project_id = serializer.validated_data.get("project_id")
        if project_id is not None:
            project = Project.objects.filter(id=project_id).first()

        result = answer_query(
            user=request.user,
            query_text=serializer.validated_data["query"],
            project=project,
        )

        query_record = Query.objects.create(
            query_text=serializer.validated_data["query"],
            response_text=result["response"],
            user=request.user,
            project=project,
            sources=result["sources"],
        )

        create_log(
            "rag_query",
            request.user,
            {"query_id": query_record.id, "project_id": project.id if project else None},
        )

        return Response(
            {
                "id": query_record.id,
                "query": query_record.query_text,
                "response": query_record.response_text,
                "sources": query_record.sources,
            },
            status=status.HTTP_200_OK,
        )
