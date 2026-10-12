from django.conf import settings
from django.core.management.base import BaseCommand

from utils.faiss_store import vector_store
from utils.rag_pipeline import index_document, index_note
from workspace.models import Document, IndexStatus, Note


class Command(BaseCommand):
    help = "Rebuild the vector index from every document and note in the database."

    def add_arguments(self, parser):
        parser.add_argument("--failed-only", action="store_true", help="Only retry documents that failed or never finished.")
        parser.add_argument("--purge-legacy", action="store_true", help="Delete index files from the old per-project layout.")

    def handle(self, *args, **options):
        if options["purge_legacy"]:
            for path in settings.RAG_STORAGE_ROOT.glob("*.npy"):
                if not path.name.startswith(vector_store.namespace + "."):
                    path.unlink()
                    path.with_name(path.name.replace(".vectors.npy", ".payloads.json")).unlink(missing_ok=True)
                    self.stdout.write(f"Removed legacy index {path.name}")

        if options["failed_only"]:
            documents = Document.objects.exclude(status=IndexStatus.READY)
            notes = Note.objects.exclude(status=IndexStatus.READY)
        else:
            vector_store.clear()
            documents = Document.objects.all()
            notes = Note.objects.all()

        for document in documents:
            chunks = index_document(document.id)
            document.refresh_from_db()
            style = self.style.SUCCESS if document.status == IndexStatus.READY else self.style.WARNING
            self.stdout.write(style(f"document #{document.id} {document.title}: {document.status} ({chunks} chunks) {document.error}"))
        for note in notes:
            chunks = index_note(note.id)
            self.stdout.write(f"note #{note.id} {note.title}: {chunks} chunks")

        self.stdout.write(self.style.SUCCESS(f"Index holds {vector_store.count()} chunks."))
