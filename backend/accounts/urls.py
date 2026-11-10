from django.urls import path

from .views import MeView, PasswordChangeView

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("password/", PasswordChangeView.as_view(), name="password-change"),
]
