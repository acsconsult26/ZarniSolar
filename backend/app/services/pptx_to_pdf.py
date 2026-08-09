"""Converts a generated .pptx to .pdf for the proposal form's "Export as
PDF" option, via LibreOffice headless (`soffice`) -- the only approach that
reliably reproduces python-pptx output (custom fonts, tables, shapes)
without re-implementing the whole deck layout in a second renderer."""
from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path


class PdfConversionError(Exception):
    pass


def convert_pptx_to_pdf(pptx_bytes: bytes, *, timeout: int = 90) -> bytes:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        src = tmp_path / "deck.pptx"
        src.write_bytes(pptx_bytes)
        try:
            subprocess.run(
                ["soffice", "--headless", "--norestore", "--convert-to", "pdf", "--outdir", str(tmp_path), str(src)],
                check=True, timeout=timeout, capture_output=True,
            )
        except FileNotFoundError:
            raise PdfConversionError("PDF export isn't available on this server (LibreOffice not installed).")
        except subprocess.TimeoutExpired:
            raise PdfConversionError("PDF conversion timed out.")
        except subprocess.CalledProcessError as e:
            raise PdfConversionError(f"PDF conversion failed: {e.stderr.decode(errors='ignore')[:300]}")

        out = tmp_path / "deck.pdf"
        if not out.exists():
            raise PdfConversionError("PDF conversion did not produce an output file.")
        return out.read_bytes()
