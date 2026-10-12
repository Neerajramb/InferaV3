from django.urls import path

from accounts.views import TeamListCreateView, TeamMemberDetailView

from . import views

urlpatterns = [
    path("dashboard/", views.DashboardView.as_view(), name="dashboard"),
    path("system/status/", views.SystemStatusView.as_view(), name="system-status"),
    path("search/", views.SearchView.as_view(), name="search"),

    path("projects/", views.ProjectListCreateView.as_view(), name="project-list"),
    path("projects/<int:pk>/", views.ProjectDetailView.as_view(), name="project-detail"),
    path("projects/<int:pk>/members/", views.ProjectMemberView.as_view(), name="project-members"),
    path("projects/<int:pk>/members/<int:user_id>/", views.ProjectMemberView.as_view(), name="project-member"),

    path("team/", TeamListCreateView.as_view(), name="team-list"),
    path("team/<int:pk>/", TeamMemberDetailView.as_view(), name="team-member"),

    path("messages/", views.DirectMessageListCreateView.as_view(), name="message-list"),
    path("messages/conversations/", views.ConversationListView.as_view(), name="message-conversations"),
    path("messages/unread/", views.UnreadCountView.as_view(), name="message-unread"),

    path("folders/", views.FolderListCreateView.as_view(), name="folder-list"),
    path("folders/tree/", views.FolderTreeView.as_view(), name="folder-tree"),
    path("folders/<int:pk>/", views.FolderDetailView.as_view(), name="folder-detail"),

    path("documents/", views.DocumentListView.as_view(), name="document-list"),
    path("documents/upload/", views.DocumentUploadView.as_view(), name="document-upload"),
    path("documents/<int:pk>/", views.DocumentDetailView.as_view(), name="document-detail"),
    path("documents/<int:pk>/download/", views.DocumentDownloadView.as_view(), name="document-download"),
    path("documents/<int:pk>/reindex/", views.DocumentReindexView.as_view(), name="document-reindex"),

    path("notes/", views.NoteListCreateView.as_view(), name="note-list"),
    path("notes/<int:pk>/", views.NoteDetailView.as_view(), name="note-detail"),

    path("logs/", views.LogListView.as_view(), name="log-list"),
    path("logs/actions/", views.LogActionsView.as_view(), name="log-actions"),

    path("chat/", views.ChatView.as_view(), name="chat"),
    path("chat/stream/", views.ChatStreamView.as_view(), name="chat-stream"),
    path("chat/sessions/", views.ChatSessionListCreateView.as_view(), name="chat-session-list"),
    path("chat/sessions/<int:pk>/", views.ChatSessionDetailView.as_view(), name="chat-session-detail"),
]
