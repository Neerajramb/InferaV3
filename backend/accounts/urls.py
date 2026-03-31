from django.urls import path

from .views import RegisterView, CustomTokenObtainPairView, MeView, DashboardView, UpdateRoleView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path('profile/update-role/', UpdateRoleView.as_view(), name='update-role'),
]
