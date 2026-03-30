from __future__ import annotations

from pathlib import Path


def extract_pdf_text(file_path: Path) -> str:
    from pypdf import PdfReader

    reader = PdfReader(str(file_path))
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return "\n".join(pages).strip()


def extract_docx_text(file_path: Path) -> str:
    from docx import Document as DocxDocument

    document = DocxDocument(str(file_path))
    return "\n".join(paragraph.text for paragraph in document.paragraphs).strip()


def extract_txt_text(file_path: Path) -> str:
    try:
        return file_path.read_text(encoding="utf-8").strip()
    except UnicodeDecodeError:
        return file_path.read_text(encoding="latin-1", errors="ignore").strip()


def extract_text(file_path: str | Path) -> str:
    path = Path(file_path)
    suffix = path.suffix.lower()

    if suffix == ".pdf":
        return extract_pdf_text(path)
    if suffix == ".docx":
        return extract_docx_text(path)
    if suffix == ".txt":
        return extract_txt_text(path)

    raise ValueError(f"Unsupported file type: {suffix}")
