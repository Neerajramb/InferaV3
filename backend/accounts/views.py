from rest_framework import generics, permissions, status # Added status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.utils import timezone

from workspace.models import Log

from .serializers import (
    CustomTokenObtainPairSerializer,
    DashboardSerializer,
    RegisterSerializer,
    UserSerializer,
)

# ... (RegisterView and CustomTokenObtainPairView remain the same)

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            username = request.data.get("username")
            from django.contrib.auth import get_user_model

            User = get_user_model()
            user = User.objects.filter(username=username).first()
            if user:
                user.last_seen = timezone.now()
                user.save(update_fields=["last_seen"])
                Log.objects.create(action="login", user=user, metadata={"channel": "jwt"})
        return response


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


# 🔥 NEW: Backend endpoint for the Dev Tool to switch roles
class UpdateRoleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        new_role = request.data.get("role")
        if not new_role:
            return Response({"error": "No role provided"}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        user.role = new_role
        user.save(update_fields=["role"])

        # Log the change for the Founder to see in the Activity Log
        Log.objects.create(
            action="role_switched", 
            user=user, 
            metadata={"new_role": new_role}
        )

        return Response({"status": "success", "role": user.role})


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        payload = DashboardSerializer.build_for_user(request.user)
        serializer = DashboardSerializer(payload)
        return Response(serializer.data)