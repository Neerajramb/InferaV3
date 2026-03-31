from django.urls import path
from .views import (
    DashboardView,
    ProjectListCreateView, ProjectDetailView,
    TeamListView,
    DirectMessageListCreateView, DirectMessageReadView,
    FolderListCreateView, FolderDetailView, FolderTreeView,
    DocumentListView, DocumentUploadView, DocumentDeleteView,
    NoteListCreateView, NoteDetailView,
    LogListView,
    ChatSessionListCreateView, ChatSessionDetailView, ChatView
)

urlpatterns = [
    # --- DASHBOARD ---
    path('dashboard/', DashboardView.as_view(), name='dashboard'),

    # --- PROJECTS & TEAM ---
    path('projects/', ProjectListCreateView.as_view(), name='project-list'),
    path('projects/<int:pk>/', ProjectDetailView.as_view(), name='project-detail'),
    path('team/', TeamListView.as_view(), name='team-list'),

    # --- MESSAGING ---
    path('messages/', DirectMessageListCreateView.as_view(), name='message-list'),
    path('messages/<int:pk>/read/', DirectMessageReadView.as_view(), name='message-read'),

    # --- FOLDERS ---
    path('folders/', FolderListCreateView.as_view(), name='folder-list'),
    path('folders/tree/', FolderTreeView.as_view(), name='folder-tree'),
    path('folders/<int:pk>/', FolderDetailView.as_view(), name='folder-detail'),

    # --- DOCUMENTS ---
    path('documents/', DocumentListView.as_view(), name='document-list'),
    path('documents/upload/', DocumentUploadView.as_view(), name='document-upload'),
    path('documents/<int:pk>/', DocumentDeleteView.as_view(), name='document-delete'),

    # --- NOTES ---
    path('notes/', NoteListCreateView.as_view(), name='note-list'),
    path('notes/<int:pk>/', NoteDetailView.as_view(), name='note-detail'),

    # --- LOGS ---
    path('logs/', LogListView.as_view(), name='log-list'),

    # --- AI CHAT ---
    path('chat/sessions/', ChatSessionListCreateView.as_view(), name='chat-session-list'),
    path('chat/sessions/<int:pk>/', ChatSessionDetailView.as_view(), name='chat-session-detail'),
    path('chat/', ChatView.as_view(), name='chat'),
]