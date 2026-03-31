from rest_framework.permissions import SAFE_METHODS, BasePermission

from accounts.models import User


class IsAuthenticatedRole(BasePermission):
    allowed_roles: set[str] = set()

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in self.allowed_roles
        )


class IsFounder(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Roles.FOUNDER)


class ProjectPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return request.user.role in {User.Roles.FOUNDER, User.Roles.HR, User.Roles.PM, User.Roles.EMPLOYEE}
        return request.user.role in {User.Roles.FOUNDER, User.Roles.PM}


class DocumentPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return request.user.role in {
                User.Roles.FOUNDER,
                User.Roles.HR,
                User.Roles.PM,
                User.Roles.EMPLOYEE,
            }
        return request.user.role in {User.Roles.FOUNDER, User.Roles.HR, User.Roles.PM}


class FolderPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in {User.Roles.FOUNDER, User.Roles.HR, User.Roles.PM}


class NotePermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return True


class ChatPermission(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class TeamPermission(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {User.Roles.FOUNDER, User.Roles.HR, User.Roles.PM}
        )


class MessagePermission(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class LogPermission(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Roles.FOUNDER)
