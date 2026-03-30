from django.urls import path

from .views import (
    ChatView,
    DocumentDeleteView,
    DocumentListView,
    DocumentUploadView,
    LogListView,
    ProjectDeleteView,
    ProjectListCreateView,
    QueryListView,
)

urlpatterns = [
    path("projects/", ProjectListCreateView.as_view(), name="projects"),
    path("projects/<int:pk>/", ProjectDeleteView.as_view(), name="project-delete"),
    path("documents/", DocumentListView.as_view(), name="documents"),
    path("documents/upload/", DocumentUploadView.as_view(), name="document-upload"),
    path("documents/<int:pk>/", DocumentDeleteView.as_view(), name="document-delete"),
    path("queries/", QueryListView.as_view(), name="queries"),
    path("logs/", LogListView.as_view(), name="logs"),
    path("chat/", ChatView.as_view(), name="chat"),
]
