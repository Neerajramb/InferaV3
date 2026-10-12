from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from workspace.audit import audit

from .models import normalize_role
from .roles import CanAddMembers, IsFounder
from .serializers import (
    CustomTokenObtainPairSerializer,
    MemberCreateSerializer,
    MemberUpdateSerializer,
    MeSerializer,
    PasswordChangeSerializer,
    ProfileUpdateSerializer,
    UserSerializer,
)

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user = User.objects.filter(username=request.data.get("username")).first()
            audit(user, "login", channel="jwt")
        return response


class MeView(APIView):
    def get(self, request):
        return Response(MeSerializer(request.user).data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MeSerializer(request.user).data)


class PasswordChangeView(APIView):
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        audit(request.user, "password_changed")
        return Response(status=status.HTTP_204_NO_CONTENT)


class DevRoleSwitchView(APIView):
    """Lets a developer preview each role. Disabled unless ALLOW_ROLE_SWITCH is on."""

    def patch(self, request):
        if not settings.ALLOW_ROLE_SWITCH:
            return Response({"detail": "Role switching is disabled on this server."}, status=status.HTTP_403_FORBIDDEN)
        raw_role = request.data.get("role")
        if not raw_role:
            return Response({"detail": "No role provided."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        previous = user.role
        user.role = normalize_role(raw_role)
        user.save(update_fields=["role"])
        audit(user, "role_switched", previous=previous, new_role=user.role)
        return Response(MeSerializer(user).data)


class TeamListCreateView(generics.ListCreateAPIView):
    """Everyone can read the directory (for messaging and project invites);
    only Founder and HR can add people."""

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), CanAddMembers()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        return MemberCreateSerializer if self.request.method == "POST" else UserSerializer

    def get_queryset(self):
        queryset = User.objects.order_by("username")
        if self.request.query_params.get("include_inactive") != "1":
            queryset = queryset.filter(is_active=True)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        audit(request.user, "member_created", username=user.username, role=user.role)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class TeamMemberDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsFounder()]

    def get_serializer_class(self):
        return UserSerializer if self.request.method in permissions.SAFE_METHODS else MemberUpdateSerializer

    def update(self, request, *args, **kwargs):
        member = self.get_object()
        before = {"role": member.role, "is_active": member.is_active}
        serializer = MemberUpdateSerializer(member, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        changes = {k: getattr(member, k) for k in before if getattr(member, k) != before[k]}
        if changes:
            audit(request.user, "member_updated", username=member.username, **changes)
        return Response(UserSerializer(member).data)
