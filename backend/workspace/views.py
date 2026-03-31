from django.contrib.auth import get_user_model
from django.db.models import Q, QuerySet
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

# --- INTERNAL IMPORTS ---
from utils.rag_pipeline import (
    answer_query, delete_document_from_index, delete_note_from_index,
    process_note, process_uploaded_document,
)

from .models import (
    ChatMessage, ChatSession, Document, Folder, 
    Log, Message, Note, Project, ProjectMember, Query
)

from .serializers import (
    ChatRequestSerializer, ChatSessionSerializer, DirectMessageSerializer,
    DocumentSerializer, FolderSerializer, FolderTreeSerializer, 
    LogSerializer, NoteSerializer, ProjectSerializer, QuerySerializer, TeamMemberSerializer,
)

User = get_user_model()

# --- UTILS ---
def touch_user_presence(user):
    if user and user.is_authenticated:
        User.objects.filter(pk=user.pk).update(last_seen=timezone.now())

# --- BULLETPROOF ISOLATION LAYER ---

def project_queryset_for_user(user) -> QuerySet[Project]:
    user_role = str(user.role).strip().upper()
    if user_role == "FOUNDER":
        return Project.objects.all()
    
    assigned_ids = list(ProjectMember.objects.filter(user=user).values_list('project_id', flat=True))
    return Project.objects.filter(Q(owner=user) | Q(id__in=assigned_ids)).distinct()

def document_queryset_for_user(user) -> QuerySet[Document]:
    user_role = str(user.role).strip().upper()
    if user_role == "FOUNDER":
        return Document.objects.all()
    
    user_projects = project_queryset_for_user(user)
    project_ids = list(user_projects.values_list('id', flat=True))
    
    return Document.objects.filter(
        Q(project_id__in=project_ids) | Q(uploaded_by=user)
    ).distinct()

# --- DASHBOARD ---

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        user = request.user
        user_role = str(user.role).strip().upper()
        touch_user_presence(user)
        
        user_projects = project_queryset_for_user(user)
        user_documents = document_queryset_for_user(user)
        
        stats = {
            "projects": len(user_projects),
            "documents": len(user_documents),
            # 🔥 FIXED: Only Founder and HR see the Team count. PM and Employee see 0.
            "team": User.objects.count() if user_role in ["FOUNDER", "HR"] else 0,
            "queries": Log.objects.filter(user=user, action="ai_query").count(),
        }
        
        activities = Log.objects.filter(user=user).order_by('-timestamp')[:5]
        activity_data = [{"id": a.id, "action": a.action.replace('_',' ').capitalize(), "timestamp": a.timestamp} for a in activities]
        
        return Response({
            "username": user.username,
            "role": user.role,
            "stats": stats,
            "recent_activities": activity_data
        })

# --- PROJECTS & TEAM ---

class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return project_queryset_for_user(self.request.user).prefetch_related("memberships__user").order_by('-id')
    def perform_create(self, serializer):
        project = serializer.save(owner=self.request.user, created_by=self.request.user)
        ProjectMember.objects.get_or_create(project=project, user=self.request.user, defaults={"role": "owner"})
        user_ids = self.request.data.get("user_ids", [])
        if isinstance(user_ids, list):
            for u_id in set(user_ids):
                try:
                    uid = int(str(u_id))
                    if uid != self.request.user.id:
                        ProjectMember.objects.get_or_create(project=project, user_id=uid, defaults={"role": "member"})
                except: continue
        Log.objects.create(user=self.request.user, action="project_created", metadata={"name": project.name})

class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self): return project_queryset_for_user(self.request.user).prefetch_related("memberships__user")

class TeamListView(generics.ListAPIView):
    serializer_class = TeamMemberSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return User.objects.all().order_by("username")

# --- REMAINING VIEWS ---

class DirectMessageListCreateView(generics.ListCreateAPIView):
    serializer_class = DirectMessageSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        other = self.request.query_params.get("user_id")
        if not other: return Message.objects.none()
        return Message.objects.filter(Q(sender=self.request.user, receiver_id=other) | Q(sender_id=other, receiver=self.request.user)).order_by('created_at')
    def perform_create(self, serializer): serializer.save(sender=self.request.user)

class DirectMessageReadView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, pk):
        msg = generics.get_object_or_404(Message, pk=pk, receiver=request.user)
        msg.is_read = True
        msg.save(update_fields=["is_read"])
        return Response({"status": "read"})

class FolderListCreateView(generics.ListCreateAPIView):
    serializer_class = FolderSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self): return Folder.objects.filter(Q(project__in=project_queryset_for_user(self.request.user)) | Q(created_by=self.request.user)).distinct()
    def perform_create(self, serializer): serializer.save(created_by=self.request.user)

class FolderDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FolderSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self): return Folder.objects.all()

class FolderTreeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        visible = Folder.objects.filter(Q(project__in=project_queryset_for_user(request.user)) | Q(created_by=request.user)).distinct()
        roots = visible.filter(parent__isnull=True).prefetch_related("children", "documents", "notes")
        return Response(FolderTreeSerializer(roots, many=True).data)

class DocumentListView(generics.ListAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self): return document_queryset_for_user(self.request.user)

class DocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    def post(self, request):
        file = request.FILES.get("file")
        if not file: return Response(status=400)
        doc = Document.objects.create(title=request.data.get("title") or file.name, file=file, uploaded_by=request.user)
        process_uploaded_document(doc)
        return Response({"id": doc.id}, status=201)

class DocumentDeleteView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]
    def get_queryset(self): return document_queryset_for_user(self.request.user)

class NoteListCreateView(generics.ListCreateAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self): return Note.objects.filter(Q(project__in=project_queryset_for_user(self.request.user)) | Q(user=self.request.user)).distinct()
    def perform_create(self, serializer): 
        note = serializer.save(user=self.request.user); process_note(note)

class NoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self): return Note.objects.all()

class LogListView(generics.ListAPIView):
    serializer_class = LogSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        user = self.request.user
        if (str(user.role).strip().upper() == "FOUNDER" or user.is_staff):
            return Log.objects.select_related("user").all().order_by("-timestamp")
        return Log.objects.filter(user=user).select_related("user").order_by("-timestamp")

class ChatSessionListCreateView(generics.ListCreateAPIView):
    serializer_class = ChatSessionSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self): return ChatSession.objects.filter(user=self.request.user).order_by("-updated_at")

class ChatSessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ChatSessionSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self): return ChatSession.objects.filter(user=self.request.user)

class ChatView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        touch_user_presence(request.user)
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        query = serializer.validated_data["query"]
        p_id = serializer.validated_data.get("project_id")
        project = Project.objects.filter(id=p_id).first() if p_id else None
        res = answer_query(user=request.user, query_text=query, project=project)
        session = ChatSession.objects.create(user=request.user, title=query[:50], project=project)
        ChatMessage.objects.create(session=session, role="user", content=query)
        ChatMessage.objects.create(session=session, role="ai", content=res["response"], sources=res["sources"])
        return Response({"response": res["response"], "session_id": session.id, "sources": res["sources"]})