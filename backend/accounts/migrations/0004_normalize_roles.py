from django.db import migrations


def normalize_roles(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    canonical = {"founder": "Founder", "hr": "HR", "pm": "PM", "employee": "Employee"}
    for user in User.objects.all():
        role = canonical.get(str(user.role or "").strip().lower(), "Employee")
        if user.is_superuser and role == "Employee":
            role = "Founder"
        if role != user.role:
            user.role = role
            user.save(update_fields=["role"])


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_user_last_seen"),
    ]

    operations = [
        migrations.RunPython(normalize_roles, migrations.RunPython.noop),
    ]
