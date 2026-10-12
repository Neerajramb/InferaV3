"""Single source of truth for who can see and change what.

Rules
- Founder sees every project and document. Personal notes stay private to their author.
- Everyone else sees projects they own or belong to, documents and notes in
  those projects, and their own personal (project-less) items.
- Owners and editors of a project can add content to it. Viewers can only read.
- Only the Founder or the project owner can change a project or its members.
"""
from __future__ import annotations

from django.db.models import Q, QuerySet

from accounts.roles import is_founder

from .models import ChatSession, Document, Folder, Note, Project, ProjectMember

EDIT_ROLES = {ProjectMember.MemberRole.OWNER, ProjectMember.MemberRole.EDITOR}


def visible_projects(user) -> QuerySet[Project]:
    if is_founder(user):
        return Project.objects.all()
    return Project.objects.filter(Q(owner=user) | Q(memberships__user=user)).distinct()


def visible_project_ids(user) -> set[int]:
    return set(visible_projects(user).values_list("id", flat=True))


def project_role(user, project: Project | None) -> str | None:
    """The user's effective role in a project: owner, editor, viewer or None."""
    if project is None:
        return None
    if project.owner_id == user.id:
        return ProjectMember.MemberRole.OWNER
    membership = ProjectMember.objects.filter(project=project, user=user).values_list("role", flat=True).first()
    if membership:
        return membership
    if is_founder(user):
        return ProjectMember.MemberRole.OWNER
    return None


def can_manage_project(user, project: Project) -> bool:
    return is_founder(user) or project.owner_id == user.id


def can_contribute(user, project: Project | None) -> bool:
    """Can the user add documents, notes or folders to this space?"""
    if project is None:
        return True  # personal space
    return project_role(user, project) in EDIT_ROLES


def visible_documents(user) -> QuerySet[Document]:
    if is_founder(user):
        return Document.objects.all()
    return Document.objects.filter(
        Q(project__in=visible_projects(user)) | Q(project__isnull=True, uploaded_by=user)
    ).distinct()


def can_delete_document(user, document: Document) -> bool:
    if is_founder(user) or document.uploaded_by_id == user.id:
        return True
    return document.project is not None and can_manage_project(user, document.project)


def visible_notes(user) -> QuerySet[Note]:
    return Note.objects.filter(
        Q(project__in=visible_projects(user)) | Q(project__isnull=True, user=user)
    ).distinct()


def can_edit_note(user, note: Note) -> bool:
    if note.user_id == user.id:
        return True
    return note.project is not None and project_role(user, note.project) in EDIT_ROLES


def visible_folders(user) -> QuerySet[Folder]:
    return Folder.objects.filter(
        Q(project__in=visible_projects(user)) | Q(project__isnull=True, created_by=user)
    ).distinct()


def can_edit_folder(user, folder: Folder) -> bool:
    if folder.project_id is None:
        return folder.created_by_id == user.id
    return can_contribute(user, folder.project)


def folder_descendant_ids(folder_ids: list[int]) -> set[int]:
    """Expand folder ids to include every nested subfolder."""
    result = set(folder_ids)
    frontier = set(folder_ids)
    while frontier:
        children = set(Folder.objects.filter(parent_id__in=frontier).values_list("id", flat=True)) - result
        result |= children
        frontier = children
    return result


def visible_sessions(user) -> QuerySet[ChatSession]:
    return ChatSession.objects.filter(user=user)
