from django.urls import path

from .views import DevRoleSwitchView, MeView, PasswordChangeView

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("password/", PasswordChangeView.as_view(), name="password-change"),
    path("profile/update-role/", DevRoleSwitchView.as_view(), name="update-role"),
]
