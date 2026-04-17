"""
ResumeExtractor: Extracts raw text from PDF or plain-text resumes.
Supports .pdf, .txt, and raw string input.
"""
from __future__ import annotations

import io
import logging
from pathlib import Path
from typing import Union

logger = logging.getLogger(__name__)


class ResumeExtractor:
    """
    Extracts raw text from a resume file (PDF or TXT) or from raw bytes.

    Usage:
        extractor = ResumeExtractor()
        text = extractor.extract(file_path="resume.pdf")
        text = extractor.extract(file_bytes=b"...", filename="resume.pdf")
    """

    def extract(
        self,
        file_path: Union[str, Path, None] = None,
        file_bytes: Union[bytes, None] = None,
        filename: str = "resume.pdf",
    ) -> str:
        """
        Extract text from a resume.

        Args:
            file_path: Path to the resume file (PDF or TXT).
            file_bytes: Raw bytes of the resume (from HTTP upload).
            filename: Original filename — used to determine format when using bytes.

        Returns:
            Extracted plain text string.

        Raises:
            ValueError: If neither file_path nor file_bytes is provided.
            RuntimeError: If extraction fails.
        """
        if file_path is not None:
            return self._extract_from_path(Path(file_path))

        if file_bytes is not None:
            return self._extract_from_bytes(file_bytes, filename)

        raise ValueError("Provide either file_path or file_bytes.")

    # ------------------------------------------------------------------
    # Internal methods
    # ------------------------------------------------------------------

    def _extract_from_path(self, path: Path) -> str:
        if not path.exists():
            raise FileNotFoundError(f"Resume file not found: {path}")

        suffix = path.suffix.lower()
        if suffix == ".pdf":
            return self._extract_pdf(path.read_bytes())
        elif suffix in (".txt", ".md"):
            return path.read_text(encoding="utf-8", errors="ignore")
        else:
            raise ValueError(f"Unsupported file format: {suffix}. Use .pdf or .txt")

    def _extract_from_bytes(self, data: bytes, filename: str) -> str:
        suffix = Path(filename).suffix.lower()
        if suffix == ".pdf":
            return self._extract_pdf(data)
        elif suffix in (".txt", ".md"):
            return data.decode("utf-8", errors="ignore")
        else:
            raise ValueError(f"Unsupported file format: {suffix}. Use .pdf or .txt")

    def _extract_pdf(self, data: bytes) -> str:
        """Extract text from PDF bytes using pdfplumber."""
        try:
            import pdfplumber
        except ImportError as e:
            raise ImportError("pdfplumber is required. Run: pip install pdfplumber") from e

        text_parts: list[str] = []

        with pdfplumber.open(io.BytesIO(data)) as pdf:
            logger.info(f"PDF has {len(pdf.pages)} page(s)")
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
                else:
                    logger.warning(f"Page {i + 1} yielded no text (may be image-based)")

        full_text = "\n\n".join(text_parts).strip()

        if not full_text:
            raise RuntimeError(
                "No text could be extracted. The PDF may be image-based or encrypted. "
                "Consider using a text-based PDF or converting with OCR."
            )

        logger.info(f"Extracted {len(full_text)} characters from PDF.")
        return full_text
