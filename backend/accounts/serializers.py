from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import normalize_role
from .roles import Roles

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    online = serializers.BooleanField(source="is_online", read_only=True)
    display_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id", "username", "first_name", "last_name", "display_name", "email",
            "role", "last_seen", "online", "is_active", "date_joined",
        )
        read_only_fields = fields


class MeSerializer(UserSerializer):
    class Meta(UserSerializer.Meta):
        read_only_fields = ("id", "username", "role", "last_seen", "online", "is_active", "date_joined")


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("first_name", "last_name", "email")


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        validate_password(attrs["new_password"], self.context["request"].user)
        return attrs


class MemberCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "password", "email", "first_name", "last_name", "role")
        read_only_fields = ("id",)

    def validate_role(self, value):
        role = normalize_role(value)
        actor = self.context["request"].user
        if role == Roles.FOUNDER and actor.role != Roles.FOUNDER:
            raise serializers.ValidationError("Only the Founder can create another Founder.")
        return role

    def validate(self, attrs):
        candidate = User(username=attrs.get("username"), email=attrs.get("email", ""))
        validate_password(attrs["password"], candidate)
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class MemberUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("role", "is_active", "first_name", "last_name", "email")

    def validate_role(self, value):
        return normalize_role(value)

    def validate(self, attrs):
        target = self.instance
        actor = self.context["request"].user
        if target == actor and ("role" in attrs and attrs["role"] != actor.role or attrs.get("is_active") is False):
            raise serializers.ValidationError("You cannot change your own role or deactivate yourself.")
        return attrs


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        token["role"] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        self.user.last_seen = timezone.now()
        self.user.save(update_fields=["last_seen"])
        data["user"] = MeSerializer(self.user).data
        return data
