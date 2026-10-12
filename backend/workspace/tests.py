import json
import shutil
import tempfile

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from utils.faiss_store import vector_store
from workspace.models import ChatSession, Document, Log, Message, Note, Project, ProjectMember, Query

User = get_user_model()
PASSWORD = "a-strong-test-passphrase"
MEDIA = tempfile.mkdtemp(prefix="infera-media-")


@override_settings(MEDIA_ROOT=MEDIA, ALLOW_ROLE_SWITCH=False)
class WorkspaceTestCase(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        vector_store.clear()
        self.founder = User.objects.create_user("ananya", password=PASSWORD, role="Founder")
        self.hr = User.objects.create_user("tomas", password=PASSWORD, role="HR")
        self.pm = User.objects.create_user("wei", password=PASSWORD, role="PM")
        self.alice = User.objects.create_user("ifeoma", password=PASSWORD, role="Employee")
        self.bob = User.objects.create_user("rohan", password=PASSWORD, role="Employee")

    def as_user(self, user):
        self.client.force_authenticate(user)

    def upload(self, user, name, body, project=None):
        self.as_user(user)
        data = {"file": SimpleUploadedFile(name, body.encode())}
        if project:
            data["project"] = project.id
        return self.client.post("/api/documents/upload/", data, format="multipart")

    def make_project(self, owner, *members):
        project = Project.objects.create(name="Ops", owner=owner, created_by=owner)
        ProjectMember.objects.create(project=project, user=owner, role="owner")
        for member, role in members:
            ProjectMember.objects.create(project=project, user=member, role=role)
        return project


class AuthTests(WorkspaceTestCase):
    def test_login_returns_profile_and_is_audited(self):
        response = self.client.post("/api/token/", {"username": "wei", "password": PASSWORD})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["role"], "PM")
        self.assertTrue(Log.objects.filter(action="login", user=self.pm).exists())

    def test_role_switch_is_disabled_by_default(self):
        self.as_user(self.alice)
        response = self.client.patch("/api/auth/profile/update-role/", {"role": "Founder"})
        self.assertEqual(response.status_code, 403)
        self.alice.refresh_from_db()
        self.assertEqual(self.alice.role, "Employee")

    @override_settings(ALLOW_ROLE_SWITCH=True)
    def test_role_switch_normalizes_role_when_enabled(self):
        self.as_user(self.alice)
        response = self.client.patch("/api/auth/profile/update-role/", {"role": "pm"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["role"], "PM")

    def test_only_founder_and_hr_can_add_people(self):
        payload = {"username": "newhire", "password": PASSWORD, "role": "Employee"}
        self.as_user(self.alice)
        self.assertEqual(self.client.post("/api/team/", payload).status_code, 403)
        self.as_user(self.hr)
        self.assertEqual(self.client.post("/api/team/", payload).status_code, 201)

    def test_hr_cannot_create_a_founder(self):
        self.as_user(self.hr)
        response = self.client.post("/api/team/", {"username": "boss", "password": PASSWORD, "role": "Founder"})
        self.assertEqual(response.status_code, 400)

    def test_only_founder_changes_roles(self):
        self.as_user(self.hr)
        self.assertEqual(self.client.patch(f"/api/team/{self.alice.id}/", {"role": "PM"}).status_code, 403)
        self.as_user(self.founder)
        response = self.client.patch(f"/api/team/{self.alice.id}/", {"role": "PM"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["role"], "PM")


class ProjectTests(WorkspaceTestCase):
    def test_employees_cannot_create_projects(self):
        self.as_user(self.alice)
        self.assertEqual(self.client.post("/api/projects/", {"name": "Side quest"}).status_code, 403)

    def test_pm_creates_project_with_members(self):
        self.as_user(self.pm)
        response = self.client.post("/api/projects/", {"name": "Ops", "member_ids": [self.alice.id]}, format="json")
        self.assertEqual(response.status_code, 201)
        roles = {m["user"]["username"]: m["role"] for m in response.data["members"]}
        self.assertEqual(roles, {"wei": "owner", "ifeoma": "editor"})

    def test_non_members_cannot_see_project(self):
        project = self.make_project(self.pm, (self.alice, "editor"))
        self.as_user(self.bob)
        self.assertEqual(self.client.get(f"/api/projects/{project.id}/").status_code, 404)
        self.assertEqual(self.client.get("/api/projects/").data, [])

    def test_members_cannot_delete_project(self):
        project = self.make_project(self.pm, (self.alice, "editor"))
        self.as_user(self.alice)
        self.assertEqual(self.client.delete(f"/api/projects/{project.id}/").status_code, 403)


class DocumentTests(WorkspaceTestCase):
    def test_upload_indexes_document(self):
        response = self.upload(self.alice, "notes.txt", "The warehouse opens at 6am on weekdays.")
        self.assertEqual(response.status_code, 201)
        document = Document.objects.get(pk=response.data["id"])
        self.assertEqual(document.status, "ready")
        self.assertGreater(document.chunk_count, 0)

    def test_rejects_unsupported_file_types(self):
        response = self.upload(self.alice, "payload.exe", "MZ")
        self.assertEqual(response.status_code, 400)

    def test_viewers_cannot_upload_to_project(self):
        project = self.make_project(self.pm, (self.alice, "viewer"))
        self.assertEqual(self.upload(self.alice, "a.txt", "hello world", project).status_code, 403)

    def test_personal_documents_are_private(self):
        doc_id = self.upload(self.alice, "salary.txt", "Confidential salary bands.").data["id"]
        self.as_user(self.bob)
        self.assertEqual(self.client.get(f"/api/documents/{doc_id}/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/documents/{doc_id}/download/").status_code, 404)
        self.as_user(self.founder)
        self.assertEqual(self.client.get(f"/api/documents/{doc_id}/").status_code, 200)

    def test_delete_removes_vectors(self):
        doc_id = self.upload(self.alice, "a.txt", "Quarterly planning happens in March.").data["id"]
        self.assertGreater(vector_store.count(), 0)
        self.assertEqual(self.client.delete(f"/api/documents/{doc_id}/").status_code, 204)
        self.assertEqual(vector_store.count(), 0)

    def test_download_requires_access(self):
        doc_id = self.upload(self.alice, "a.txt", "plain text body").data["id"]
        response = self.client.get(f"/api/documents/{doc_id}/download/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(b"".join(response.streaming_content), b"plain text body")


class NoteTests(WorkspaceTestCase):
    def test_update_reindexes_note(self):
        self.as_user(self.alice)
        note_id = self.client.post("/api/notes/", {"title": "Plan", "content": "alpha bravo"}).data["id"]
        self.client.patch(f"/api/notes/{note_id}/", {"content": "charlie delta echo"})
        texts = [p["text"] for p in vector_store._payloads if p["entity_id"] == note_id]
        self.assertTrue(texts and all("charlie" in t for t in texts))

    def test_others_cannot_edit_personal_note(self):
        note = Note.objects.create(title="Mine", content="secret", user=self.alice)
        self.as_user(self.bob)
        self.assertEqual(self.client.patch(f"/api/notes/{note.id}/", {"content": "x"}).status_code, 404)


class ChatTests(WorkspaceTestCase):
    def test_answers_cite_only_accessible_documents(self):
        self.upload(self.alice, "launch.txt", "The Falcon launch date is 14 November at the Pune office.")
        self.upload(self.bob, "other.txt", "The Falcon launch budget is confidential to Rohan.")
        self.as_user(self.alice)
        response = self.client.post("/api/chat/", {"query": "When is the Falcon launch?"}, format="json")
        self.assertEqual(response.status_code, 200)
        titles = {s["title"] for s in response.data["sources"]}
        self.assertIn("launch.txt", titles)
        self.assertNotIn("other.txt", titles)
        self.assertIn("14 November", response.data["response"])

    def test_follow_up_reuses_session(self):
        self.upload(self.alice, "a.txt", "Badge renewals happen every January.")
        first = self.client.post("/api/chat/", {"query": "When are badge renewals?"}, format="json").data
        second = self.client.post(
            "/api/chat/", {"query": "And who handles them?", "session_id": first["session_id"]}, format="json"
        ).data
        self.assertEqual(first["session_id"], second["session_id"])
        self.assertEqual(ChatSession.objects.get(pk=first["session_id"]).messages.count(), 4)
        self.assertEqual(Query.objects.filter(user=self.alice).count(), 2)

    def test_cannot_use_someone_elses_session(self):
        session = ChatSession.objects.create(user=self.bob, title="Bob's")
        self.as_user(self.alice)
        response = self.client.post("/api/chat/", {"query": "hi", "session_id": session.id}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_stream_emits_meta_tokens_and_done(self):
        self.upload(self.alice, "a.txt", "The cafeteria closes at 3pm on Fridays.")
        response = self.client.post("/api/chat/stream/", {"query": "When does the cafeteria close?"}, format="json")
        body = b"".join(response.streaming_content).decode()
        events = [line.split(": ", 1)[1] for line in body.splitlines() if line.startswith("event: ")]
        self.assertEqual(events[0], "meta")
        self.assertIn("token", events)
        self.assertEqual(events[-1], "done")
        done = json.loads(body.strip().splitlines()[-1].split("data: ", 1)[1])
        self.assertIn("3pm", done["message"]["content"])


class DashboardTests(WorkspaceTestCase):
    def test_index_counts_match_document_count(self):
        project = self.make_project(self.pm, (self.alice, "editor"))
        self.upload(self.alice, "a.txt", "alpha bravo charlie", project)
        self.upload(self.alice, "b.txt", "delta echo foxtrot")
        self.upload(self.pm, "c.txt", "golf hotel india", project)
        self.as_user(self.alice)
        data = self.client.get("/api/dashboard/").data
        self.assertEqual(data["stats"]["documents"], 3)
        self.assertEqual(data["index"]["ready"], 3)

    def test_folder_tree_counts(self):
        self.as_user(self.alice)
        folder = self.client.post("/api/folders/", {"name": "Plans"}).data["id"]
        for name in ("a.txt", "b.txt"):
            self.client.post("/api/documents/upload/", {"file": SimpleUploadedFile(name, b"text body"), "folder": folder}, format="multipart")
        tree = self.client.get("/api/folders/tree/?space=personal").data
        self.assertEqual(tree[0]["documents_count"], 2)


class MessagingTests(WorkspaceTestCase):
    def test_reading_a_thread_marks_it_read(self):
        Message.objects.create(sender=self.bob, receiver=self.alice, content="hey")
        self.as_user(self.alice)
        self.assertEqual(self.client.get("/api/messages/unread/").data["count"], 1)
        self.client.get(f"/api/messages/?user_id={self.bob.id}")
        self.assertEqual(self.client.get("/api/messages/unread/").data["count"], 0)

    def test_conversations_list_unread_counts(self):
        Message.objects.create(sender=self.bob, receiver=self.alice, content="one")
        Message.objects.create(sender=self.bob, receiver=self.alice, content="two")
        self.as_user(self.alice)
        rows = self.client.get("/api/messages/conversations/").data
        self.assertEqual(rows[0]["user_id"], self.bob.id)
        self.assertEqual(rows[0]["unread"], 2)


class LogTests(WorkspaceTestCase):
    def test_employees_only_see_their_own_logs(self):
        Log.objects.create(user=self.bob, action="secret_action")
        Log.objects.create(user=self.alice, action="mine")
        self.as_user(self.alice)
        actions = {row["action"] for row in self.client.get("/api/logs/").data["results"]}
        self.assertEqual(actions, {"mine"})
        self.as_user(self.founder)
        actions = {row["action"] for row in self.client.get("/api/logs/").data["results"]}
        self.assertTrue({"mine", "secret_action"} <= actions)


def tearDownModule():
    shutil.rmtree(settings.RAG_STORAGE_ROOT, ignore_errors=True)
