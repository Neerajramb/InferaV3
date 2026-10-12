"""Role capabilities shared by the API and its permission classes.

Keep this in sync with frontend/src/lib/rbac.ts.
"""
from rest_framework.permissions import BasePermission

from .models import User

Roles = User.Roles


def is_founder(user) -> bool:
    return bool(user and user.is_authenticated and user.role == Roles.FOUNDER)


def can_create_projects(user) -> bool:
    return user.role in {Roles.FOUNDER, Roles.PM}


def can_view_team_admin(user) -> bool:
    return user.role in {Roles.FOUNDER, Roles.HR}


def can_add_members(user) -> bool:
    return user.role in {Roles.FOUNDER, Roles.HR}


def can_view_all_logs(user) -> bool:
    return user.role == Roles.FOUNDER or user.is_staff


class IsFounder(BasePermission):
    message = "Only the Founder can do this."

    def has_permission(self, request, view):
        return is_founder(request.user)


class CanAddMembers(BasePermission):
    message = "Only Founder and HR can add people to the workspace."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and can_add_members(request.user))
