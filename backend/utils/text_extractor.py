from __future__ import annotations

from pathlib import Path

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".markdown", ".csv"}


class UnsupportedFileType(ValueError):
    pass


def extract_pdf_text(file_path: Path) -> str:
    from pypdf import PdfReader

    reader = PdfReader(str(file_path))
    return "\n\n".join((page.extract_text() or "").strip() for page in reader.pages).strip()


def extract_docx_text(file_path: Path) -> str:
    from docx import Document as DocxDocument

    document = DocxDocument(str(file_path))
    parts = [paragraph.text for paragraph in document.paragraphs]
    for table in document.tables:
        for row in table.rows:
            parts.append(" | ".join(cell.text.strip() for cell in row.cells))
    return "\n\n".join(part for part in parts if part.strip()).strip()


def extract_plain_text(file_path: Path) -> str:
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
    if suffix in {".txt", ".md", ".markdown", ".csv"}:
        return extract_plain_text(path)
    raise UnsupportedFileType(f"Unsupported file type: {suffix or 'unknown'}")
