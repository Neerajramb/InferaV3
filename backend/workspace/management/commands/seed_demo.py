from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from utils.rag_pipeline import index_document, index_note
from workspace.models import Document, Folder, Note, Project, ProjectMember

User = get_user_model()

PEOPLE = [
    ("ananya", "Ananya", "Krishnan", "Founder"),
    ("tomas", "Tomás", "Herrera", "HR"),
    ("wei", "Wei", "Lin", "PM"),
    ("ifeoma", "Ifeoma", "Okafor", "Employee"),
    ("rohan", "Rohan", "Mehta", "Employee"),
]

HANDBOOK = """# Field service handbook

## Call-out windows
Technicians respond to priority one faults within 4 hours between 07:00 and 22:00.
Outside those hours the on-call engineer is paged through the duty phone.

## Escalation
If a fault is not resolved within 24 hours, the PM on rotation escalates to the vendor.
Vendor escalations are logged in the audit tracker with the ticket number and site code.

## Safety
Lock-out tag-out is mandatory before opening any panel rated above 50 volts.
Two people must be on site for rooftop work. The site lead signs the permit.
"""

VENDOR_POLICY = """# Vendor review policy

Every vendor with access to customer data is reviewed once a year.
The review covers data retention, breach notification time and subcontractors.

Breach notification must happen within 72 hours of discovery.
Vendors that store data outside the region need written approval from the Founder.

Current reviewers: Wei Lin (operations) and Tomás Herrera (people and contracts).
"""

LEAVE_POLICY = """# Leave and time off

Full-time staff receive 24 days of paid leave per year, plus public holidays.
Up to 5 unused days carry over to the next year and expire on 31 March.
Requests longer than 5 consecutive days need two weeks notice to your manager.
Parental leave is 26 weeks at full pay for the primary carer and 6 weeks for the secondary carer.
"""


class Command(BaseCommand):
    help = "Create demo people, projects, documents and notes. Safe to run more than once."

    def add_arguments(self, parser):
        parser.add_argument("--password", default="infera-demo-2026")

    def handle(self, *args, **options):
        users = {}
        for username, first, last, role in PEOPLE:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={"first_name": first, "last_name": last, "role": role, "email": f"{username}@infera.local"},
            )
            if created:
                user.set_password(options["password"])
                user.save()
            users[username] = user

        ops, _ = Project.objects.get_or_create(
            name="Field operations",
            defaults={"owner": users["wei"], "created_by": users["wei"], "description": "Runbooks and vendor reviews for site teams."},
        )
        people, _ = Project.objects.get_or_create(
            name="People handbook",
            defaults={"owner": users["ananya"], "created_by": users["ananya"], "description": "Policies every new hire should read."},
        )
        memberships = [
            (ops, "wei", "owner"), (ops, "ifeoma", "editor"), (ops, "tomas", "viewer"),
            (people, "ananya", "owner"), (people, "tomas", "editor"), (people, "rohan", "viewer"), (people, "ifeoma", "viewer"),
        ]
        for project, username, role in memberships:
            ProjectMember.objects.get_or_create(project=project, user=users[username], defaults={"role": role})

        runbooks, _ = Folder.objects.get_or_create(name="Runbooks", project=ops, parent=None, created_by=users["wei"])

        docs = [
            (ops, runbooks, users["wei"], "field-service-handbook.md", HANDBOOK),
            (ops, None, users["wei"], "vendor-review-policy.md", VENDOR_POLICY),
            (people, None, users["tomas"], "leave-and-time-off.md", LEAVE_POLICY),
        ]
        for project, folder, owner, filename, body in docs:
            if Document.objects.filter(title=filename, project=project).exists():
                continue
            document = Document(title=filename, project=project, folder=folder, uploaded_by=owner, file_size=len(body.encode()))
            document.file.save(filename, ContentFile(body.encode("utf-8")), save=True)
            index_document(document.id)

        if not Note.objects.filter(title="Rooftop permit checklist").exists():
            note = Note.objects.create(
                title="Rooftop permit checklist",
                content="Check wind speed is under 38 km/h. Confirm harness inspection date. "
                        "Second person on site. Permit signed by the site lead before access.",
                project=ops, folder=runbooks, user=users["ifeoma"],
            )
            index_note(note.id)

        self.stdout.write(self.style.SUCCESS(
            f"Demo workspace ready. Sign in as any of: {', '.join(users)} (password: {options['password']})"
        ))
