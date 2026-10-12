from django.db.models.signals import post_delete
from django.dispatch import receiver

from utils.rag_pipeline import remove_from_index

from .models import Document, Note


@receiver(post_delete, sender=Document)
def cleanup_document(sender, instance: Document, **kwargs):
    # Runs for direct deletes and for cascades (e.g. deleting a project).
    remove_from_index("document", instance.id)
    if instance.file:
        instance.file.delete(save=False)


@receiver(post_delete, sender=Note)
def cleanup_note(sender, instance: Note, **kwargs):
    remove_from_index("note", instance.id)
