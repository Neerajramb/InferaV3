from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from workspace.models import Document, Project, Query

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "email", "role")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "username", "password", "email", "first_name", "last_name", "role")
        read_only_fields = ("id",)

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        token["role"] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class DashboardStatsSerializer(serializers.Serializer):
    projects = serializers.IntegerField()
    documents = serializers.IntegerField()
    team = serializers.IntegerField()
    queries = serializers.IntegerField()


class DashboardSerializer(serializers.Serializer):
    username = serializers.CharField()
    role = serializers.CharField()
    stats = DashboardStatsSerializer()

    @staticmethod
    def build_for_user(user):
        if user.role == User.Roles.FOUNDER:
            projects = Project.objects.count()
            documents = Document.objects.count()
            queries = Query.objects.count()
            team = User.objects.count()
        elif user.role == User.Roles.HR:
            projects = 0
            documents = Document.objects.count()
            queries = Query.objects.filter(user=user).count()
            team = User.objects.count()
        elif user.role == User.Roles.PM:
            projects = Project.objects.filter(owner=user).count()
            documents = Document.objects.count()
            queries = Query.objects.filter(user=user).count()
            team = 0
        else:
            projects = 0
            documents = Document.objects.filter(uploaded_by=user).count()
            queries = Query.objects.filter(user=user).count()
            team = 0

        return {
            "username": user.username,
            "role": user.role,
            "stats": {
                "projects": projects,
                "documents": documents,
                "team": team,
                "queries": queries,
            },
        }
