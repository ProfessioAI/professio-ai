"""A small local web service around scrub.py. Start it with `npm run scrubber`.
It only listens on this computer (127.0.0.1) and keeps nothing between requests."""

from __future__ import annotations

import base64
import io
import re

from fastapi import FastAPI
from pydantic import BaseModel
from pypdf import PdfReader

import scrub as core

app = FastAPI(title="ProfessioAI scrubber")


class VaultEntry(BaseModel):
    token: str
    type: str
    original: str


class TextIn(BaseModel):
    text: str
    vault: list[VaultEntry] = []


class PdfIn(BaseModel):
    data: str  # base64
    vault: list[VaultEntry] = []


def _result(s, vault, extra=None):
    return {
        "text": s.text,
        "entities": s.entities,
        "review": s.review,
        "needsReview": len(s.review) > 0,
        "vault": vault,
        **(extra or {}),
    }


@app.get("/health")
def health():
    core.engine()  # loads the language model on the first call
    return {"ok": True}


@app.post("/scrub")
def scrub_text(body: TextIn):
    s, vault = core.scrub(body.text, [v.model_dump() for v in body.vault])
    return _result(s, vault)


@app.post("/scrub-pdf")
def scrub_pdf(body: PdfIn):
    """Pulls the text out of a PDF (page by page), then scrubs it. A PDF with no text layer
    (a scan) is held for review instead of being passed on."""
    reader = PdfReader(io.BytesIO(base64.b64decode(body.data)))
    pages = [(p.extract_text() or "").strip() for p in reader.pages]
    total = sum(len(p) for p in pages)
    if total < 40 * max(1, len(pages)) * 0.25:
        empty = core.Scrubbed(
            text="",
            review=[{"type": "PDF", "text": "", "reason": "No readable text in this PDF (it may be a scan), so it can't be scrubbed"}],
        )
        return _result(empty, [v.model_dump() for v in body.vault], {"pages": len(pages)})
    # PDF text comes back with each line padded with spaces; tidy that before scrubbing.
    tidy = [re.sub(r"[ \t]+\n", "\n", re.sub(r"[ \t]+$", "", t, flags=re.M)) for t in pages]
    joined = "\n".join(f"=== PAGE {i} of {len(pages)} ===\n{t}\n" for i, t in enumerate(tidy, 1))
    s, vault = core.scrub(joined, [v.model_dump() for v in body.vault])
    return _result(s, vault, {"pages": len(pages)})
