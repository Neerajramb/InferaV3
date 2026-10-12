from django.db import migrations


def backfill(apps, schema_editor):
    ProjectMember = apps.get_model("workspace", "ProjectMember")
    Project = apps.get_model("workspace", "Project")
    Document = apps.get_model("workspace", "Document")
    Note = apps.get_model("workspace", "Note")

    # Old code created members with an invalid "member" role.
    ProjectMember.objects.exclude(role__in=["owner", "editor", "viewer"]).update(role="editor")

    # Every project owner should have an owner membership row.
    for project in Project.objects.all():
        ProjectMember.objects.get_or_create(project=project, user_id=project.owner_id, defaults={"role": "owner"})

    for document in Document.objects.all():
        document.status = "ready" if document.chunk_count else "pending"
        try:
            document.file_size = document.file.size
        except Exception:
            document.file_size = 0
        document.save(update_fields=["status", "file_size"])

    Note.objects.filter(chunk_count__gt=0).update(status="ready")


class Migration(migrations.Migration):
    dependencies = [
        ("workspace", "0004_index_status_and_metadata"),
    ]

    operations = [
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]
