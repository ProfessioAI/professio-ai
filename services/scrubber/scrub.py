"""Finds client identifiers in text and replaces them with tokens like [SSN_1].

Presidio (open source, runs on this computer) does the finding. It is given custom detectors for
tax identifiers, because its built-in Social Security recognizer deliberately rejects number ranges
that can't be real (000, 666, 9xx), which are exactly the ranges our fictional test data uses.
Nothing here is sent anywhere.

The caller keeps the vault (token -> original). This module never stores originals.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from presidio_analyzer import AnalyzerEngine, EntityRecognizer, RecognizerRegistry, RecognizerResult
from presidio_analyzer.nlp_engine import NlpEngineProvider

# Presidio entity types we ask for. Locations, organizations, and URLs are left alone: the assistant
# needs payer names and irs.gov links to be useful. Dates and dollar amounts are hidden only when the
# caller asks (they are not identifiers, but the person may not want them leaving the computer).
BUILT_IN = ["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD", "US_ITIN"]
TOKEN_NAME = {
    "PERSON": "PERSON",
    "EMAIL_ADDRESS": "EMAIL",
    "PHONE_NUMBER": "PHONE",
    "CREDIT_CARD": "CARD",
    "US_ITIN": "SSN",
    "SSN": "SSN",
    "EIN": "EIN",
    "ROUTING": "ROUTING",
    "ACCOUNT": "ACCOUNT",
    "DOB": "DOB",
    "ADDRESS": "ADDRESS",
    "PTIN": "PTIN",
    "DATE": "DATE",
    "AMOUNT": "AMOUNT",
}
# Below this score a hit is not replaced automatically; it is flagged for a person instead.
CONFIRMED = 0.5
# Words that spaCy sometimes mistakes for a person's name in tax paperwork.
NOT_NAMES = {
    "irs", "internal revenue service", "treasury", "department of the treasury", "tax court",
    "united states tax court", "taxpayer", "taxpayers", "client", "form", "schedule", "notice",
    "letter", "sincerely", "dear", "page", "line", "summary", "total", "balance", "refund",
}
# Toll-free numbers belong to businesses and agencies (the notice's own contact number).
TOLL_FREE = re.compile(r"^\+?1?[\s.-]*\(?(800|888|877|866|855|844|833)\)?")

NAME_WORD = r"[A-Z][a-z]+(?:[-'][A-Z][a-z]+)?"
FULL_NAME = rf"{NAME_WORD}(?: [A-Z]\.?)?(?: {NAME_WORD}){{1,2}}"
STREET_SUFFIX = (
    r"Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Court|Ct|Drive|Dr|Way|Boulevard|Blvd|Place|Pl|Circle|Cir|Terrace|Ter"
)
CITY_STATE_ZIP = r"[A-Za-z][A-Za-z .'-]*?,?[ \t]+[A-Z]{2}[ \t]+\d{5}(?:-\d{4})?"


@dataclass
class Hit:
    start: int
    end: int
    kind: str  # key of TOKEN_NAME
    score: float
    source: str
    # For a first or last name found on its own: (the full name it belongs to, "FIRST" or "LAST").
    part_of: tuple[str, str] | None = None


class RegexRecognizer(EntityRecognizer):
    """One regular expression, one entity type; `group` picks the part to replace."""

    def __init__(self, entity: str, pattern: str, score: float, group: int = 0, flags: int = 0):
        self.rx = re.compile(pattern, flags)
        self.entity = entity
        self.score = score
        self.group = group
        super().__init__(supported_entities=[entity], name=f"tax-{entity}-{abs(hash(pattern)) % 9999}")

    def load(self) -> None:  # nothing to load
        pass

    def analyze(self, text, entities, nlp_artifacts=None):
        out = []
        for m in self.rx.finditer(text):
            s, e = m.span(self.group)
            if s >= 0 and e > s:
                out.append(RecognizerResult(entity_type=self.entity, start=s, end=e, score=self.score))
        return out


def _build_engine() -> AnalyzerEngine:
    provider = NlpEngineProvider(
        nlp_configuration={
            "nlp_engine_name": "spacy",
            "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}],
        }
    )
    nlp = provider.create_engine()
    registry = RecognizerRegistry()
    registry.load_predefined_recognizers(nlp_engine=nlp, languages=["en"])
    ctx = re.IGNORECASE
    rec = [
        # Social Security / taxpayer ID numbers, any range (the built-in one rejects 000, 666, 9xx).
        RegexRecognizer("SSN", r"\b\d{3}-\d{2}-\d{4}\b", 0.95),
        RegexRecognizer("SSN", r"\b\d{3} \d{2} \d{4}\b", 0.85),
        RegexRecognizer("SSN", r"(?i)\b(?:ssn|social security(?: number)?|tin|taxpayer id(?:entification)?(?: number)?)\W{0,6}(\d{9})\b", 0.9, 1),
        RegexRecognizer("SSN", r"\b\d{9}\b", 0.3),  # a bare 9-digit number: flagged, not replaced
        RegexRecognizer("EIN", r"\b\d{2}-\d{7}\b", 0.9),
        RegexRecognizer("ROUTING", r"(?i)routing(?: number| no\.?| #)?\W{0,8}(\d{9})\b", 0.9, 1),
        RegexRecognizer("ACCOUNT", r"(?i)account(?: number| no\.?| #)?\W{0,8}(\d{6,17})\b", 0.85, 1),
        RegexRecognizer(
            "DOB",
            r"(?i)(?:born|date of birth|dob|birthdate)\W{0,6}((?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(?:[A-Z][a-z]+\.? \d{1,2}, \d{4}))",
            0.9,
            1,
        ),
        RegexRecognizer("PHONE_NUMBER", r"\(\d{3}\)[ \t]?\d{3}[ .-]\d{4}\b", 0.8),
        RegexRecognizer("PHONE_NUMBER", r"(?<![\d-])\d{3}[ .-]\d{3}[ .-]\d{4}(?![\d-])", 0.75),
        RegexRecognizer("PTIN", r"\bP\d{8}\b", 0.9),
        # Dates, written out, ISO, or numeric.
        RegexRecognizer(
            "DATE",
            r"\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.? \d{1,2}(?:st|nd|rd|th)?(?:, \d{4})?\b",
            0.85,
        ),
        RegexRecognizer("DATE", r"\b\d{4}-\d{2}-\d{2}\b", 0.85),
        RegexRecognizer("DATE", r"\b\d{1,2}/\d{1,2}/\d{2,4}\b", 0.85),
        # Dollar amounts: with a dollar sign, with thousands commas, with cents, or after a dot leader.
        RegexRecognizer("AMOUNT", r"\(\$\s?\d[\d,]*(?:\.\d+)?\)|-?\$\s?\d[\d,]*(?:\.\d+)?", 0.9),
        RegexRecognizer("AMOUNT", r"\(\d{1,3}(?:,\d{3})+(?:\.\d{2})?\)|\(\d+\.\d{2}\)", 0.8),
        RegexRecognizer("AMOUNT", r"(?<![\d,.])\d{1,3}(?:,\d{3})+(?:\.\d{2})?(?!\d|,\d)", 0.85),
        RegexRecognizer("AMOUNT", r"(?<![\d.,-])\d+\.\d{2}(?![\d%])", 0.8),
        RegexRecognizer("AMOUNT", r"(?m)\.{2,}[ \t]+(\(?\d[\d,]*(?:\.\d+)?\)?)[ \t]*$", 0.8, 1),
        # Street addresses, with the city, state, and ZIP when they follow.
        RegexRecognizer(
            "ADDRESS",
            rf"\b\d{{1,6}}[ \t]+(?:[A-Za-z][A-Za-z0-9.'-]*[ \t]+){{0,4}}(?:{STREET_SUFFIX})\b\.?(?:,?[ \t]+{CITY_STATE_ZIP})?",
            0.85,
            0,
            ctx,
        ),
        # A mailing block: NAME / street / CITY ST ZIP on three lines.
        RegexRecognizer(
            "PERSON",
            r"(?m)^([A-Z][A-Z.'-]+(?: [A-Z][A-Z.'-]*){1,3})[ \t]*\n\d{1,6} [A-Z0-9 .'-]+?[ \t]*\n[A-Z][A-Z .'-]+ [A-Z]{2} \d{5}(?:-\d{4})?[ \t]*$",
            0.9,
            1,
        ),
        RegexRecognizer(
            "ADDRESS",
            r"(?m)^[A-Z][A-Z.'-]+(?: [A-Z][A-Z.'-]*){1,3}[ \t]*\n(\d{1,6} [A-Z0-9 .'-]+?[ \t]*\n[A-Z][A-Z .'-]+ [A-Z]{2} \d{5}(?:-\d{4})?)[ \t]*$",
            0.9,
            1,
        ),
        RegexRecognizer("PERSON", rf"\bDear ({NAME_WORD})\b", 0.8, 1),
    ]
    for r in rec:
        registry.add_recognizer(r)
    return AnalyzerEngine(registry=registry, nlp_engine=nlp, supported_languages=["en"])


_engine: AnalyzerEngine | None = None


def engine() -> AnalyzerEngine:
    global _engine
    if _engine is None:
        _engine = _build_engine()
    return _engine


LABEL = re.compile(
    r"(?m)^[ \t]*(?:Taxpayers?|Clients?|Dependents?|Spouse|Name|Names|Prepared for|Client name)\s*:\s*(.+)$"
)


def _labeled_people(text: str) -> list[Hit]:
    """Names written after a label such as "Taxpayer:", "Taxpayers: A and B", "Clients: A and B C"."""
    hits: list[Hit] = []
    for m in LABEL.finditer(text):
        chunk, base = m.group(1), m.start(1)
        # Stop at the next field on the same line (two spaces, a tab, "SSN", or an opening bracket).
        cut = re.search(r"\s{2,}|\t|\s+SSNs?\b|\s*\(", chunk)
        if cut:
            chunk = chunk[: cut.start()]
        for part in re.finditer(rf"{FULL_NAME}|{NAME_WORD}", chunk):
            word = part.group(0)
            if word.lower() in NOT_NAMES:
                continue
            hits.append(Hit(base + part.start(), base + part.end(), "PERSON", 0.85, "label"))
    # "Dependent Morgan Fiction, born ..." (no colon)
    for m in re.finditer(rf"\b(?:Taxpayer|Dependent|Spouse|Client)s?[ \t]+({FULL_NAME})\b", text):
        if m.group(1).lower() not in NOT_NAMES:
            hits.append(Hit(m.start(1), m.end(1), "PERSON", 0.8, "label"))
    return hits


def _wanted_names(people: list[str]) -> dict[str, tuple[str, str] | None]:
    """Full names map to None; first and last names map to (the full name, "FIRST" or "LAST")."""
    wanted: dict[str, tuple[str, str] | None] = {}
    for full in people:
        words = [w for w in re.split(r"[ .]+", full.strip()) if len(w) >= 2]
        if len(full) >= 5:
            wanted.setdefault(full, None)
        if len(words) >= 2:
            for w, role in ((words[0], "FIRST"), (words[-1], "LAST")):
                if len(w) >= 3:
                    wanted.setdefault(w, (full, role))
    return wanted


def _propagate_people(text: str, wanted: dict[str, tuple[str, str] | None]) -> list[Hit]:
    """Once a name is found, replace it everywhere: full name, first name, last name, any case.
    First and last names found alone get tokens like [PERSON_1_FIRST] that point back to the full name."""
    hits: list[Hit] = []
    for p in sorted(wanted, key=len, reverse=True):
        if p.lower() in NOT_NAMES:
            continue
        for variant in {p, p.upper()}:
            for m in re.finditer(rf"(?<![A-Za-z]){re.escape(variant)}(?![A-Za-z])", text):
                hits.append(Hit(m.start(), m.end(), "PERSON", 0.8, "propagated", wanted[p]))
    return hits


PLAIN_NAME = re.compile(r"^[A-Za-z][A-Za-z.'-]*(?: [A-Za-z][A-Za-z.'-]*){0,3}$")


def plausible_name(span: str) -> bool:
    """spaCy sometimes calls a number or a line break a person. Real names are 1 to 4 words of letters."""
    s = span.strip()
    if len(s) < 3 or not PLAIN_NAME.match(s) or not re.search(r"[A-Z]", s):
        return False
    return not any(w.lower() in NOT_NAMES for w in s.split()) and s.lower() not in NOT_NAMES


def find(text: str, dates: bool = False, amounts: bool = False) -> list[Hit]:
    """Every identifier in the text, with overlaps resolved (longer and higher score win)."""
    wanted_types = BUILT_IN + ["SSN", "EIN", "ROUTING", "ACCOUNT", "DOB", "ADDRESS", "PTIN"]
    if dates:
        wanted_types.append("DATE")
    if amounts:
        wanted_types.append("AMOUNT")
    results = engine().analyze(text=text, language="en", entities=wanted_types)
    hits: list[Hit] = []
    for r in results:
        kind = r.entity_type
        span = text[r.start : r.end]
        if kind == "PERSON" and not plausible_name(span):
            continue
        if kind == "PHONE_NUMBER" and TOLL_FREE.match(span.strip()):
            continue
        if kind in TOKEN_NAME:
            hits.append(Hit(r.start, r.end, kind, float(r.score), "presidio"))
    hits += _labeled_people(text)
    # Only multi-word names are spread to their first and last names; a lone word is too risky.
    people = [
        text[h.start : h.end]
        for h in hits
        if h.kind == "PERSON" and h.score >= CONFIRMED and len(text[h.start : h.end].split()) >= 2
    ]
    wanted = _wanted_names(people)
    hits += _propagate_people(text, wanted)

    for h in hits:  # a span should not carry the spaces around it
        while h.start < h.end and text[h.start].isspace():
            h.start += 1
        while h.end > h.start and text[h.end - 1].isspace():
            h.end -= 1
    hits = [h for h in hits if h.end > h.start]
    hits.sort(key=lambda h: (h.start, -(h.end - h.start), -h.score))
    kept: list[Hit] = []
    for h in hits:
        if kept and h.start < kept[-1].end:
            prev = kept[-1]
            # Overlap: keep the one covering more text, or the higher score when equal.
            if (h.end - h.start, h.score) > (prev.end - prev.start, prev.score):
                kept[-1] = h
            continue
        kept.append(h)
    # A first or last name that was also spotted on its own still points back to the full name.
    for h in kept:
        word = text[h.start : h.end]
        if h.kind == "PERSON" and h.part_of is None:
            link = wanted.get(word) or wanted.get(word.title())
            if link:
                h.part_of = link
    return kept


@dataclass
class Scrubbed:
    text: str
    entities: list[dict] = field(default_factory=list)
    review: list[dict] = field(default_factory=list)


def _norm(kind: str, value: str) -> str:
    v = re.sub(r"\s+", " ", value.strip())
    return v.upper() if kind in ("PERSON", "ADDRESS") else re.sub(r"[\s-]", "", v) if kind in ("SSN", "EIN") else v


def scrub(text: str, vault: list[dict] | None = None, dates: bool = False, amounts: bool = False) -> Scrubbed:
    """Replace identifiers with tokens. `vault` is the caller's existing {token, type, original} list;
    the same value always gets the same token, and new tokens carry on the numbering."""
    vault = [dict(v) for v in (vault or [])]
    by_value: dict[tuple[str, str], str] = {}
    counts: dict[str, int] = {}
    for v in vault:
        kind = next((k for k, n in TOKEN_NAME.items() if n == v["type"]), v["type"])
        by_value[(TOKEN_NAME.get(kind, v["type"]), _norm(v["type"], v["original"]))] = v["token"]
        m = re.match(r"\[([A-Z]+)_(\d+)(?:_[A-Z]+)?\]", v["token"])
        if m:
            counts[m.group(1)] = max(counts.get(m.group(1), 0), int(m.group(2)))

    def new_token(name: str, original: str) -> str:
        """The token for a value, made (and put in the vault) if it is new."""
        k = (name, _norm(name, original))
        if k not in by_value:
            counts[name] = counts.get(name, 0) + 1
            by_value[k] = f"[{name}_{counts[name]}]"
            vault.append({"token": by_value[k], "type": name, "original": original})
        return by_value[k]

    out: list[str] = []
    review: list[dict] = []
    entities: dict[str, dict] = {}
    pos = 0
    for h in find(text, dates, amounts):
        original = text[h.start : h.end]
        if h.score < CONFIRMED:
            review.append(
                {"type": TOKEN_NAME.get(h.kind, h.kind), "text": original, "reason": "Looks like an ID number, but not sure"}
            )
            continue
        name = TOKEN_NAME[h.kind]
        key = (name, _norm(name, original))
        token = by_value.get(key)
        if token is None and h.part_of:
            full, role = h.part_of
            parent = new_token(name, full)
            token = f"{parent[:-1]}_{role}]"
            by_value[key] = token
            vault.append({"token": token, "type": name, "original": original})
        if token is None:
            token = new_token(name, original)
        out.append(text[pos : h.start])
        out.append(token)
        pos = h.end
        e = entities.setdefault(token, {"token": token, "type": name, "count": 0})
        e["count"] += 1
    out.append(text[pos:])
    scrubbed = "".join(out)

    # Fail closed: anything shaped like an ID number that is still in the text is flagged.
    without_tokens = re.sub(r"\[[A-Z]+_\d+(?:_[A-Z]+)?\]", " ", scrubbed)
    seen = {r["text"] for r in review}
    for m in re.finditer(r"\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b", without_tokens):
        if m.group(0) not in seen:
            seen.add(m.group(0))
            review.append({"type": "ID", "text": m.group(0), "reason": "An ID-like number is still in the text"})
    return Scrubbed(text=scrubbed, entities=list(entities.values()), review=review), vault  # type: ignore[return-value]


def rehydrate(text: str, vault: list[dict]) -> str:
    """Put the original values back in place of tokens."""
    lookup = {v["token"]: v["original"] for v in vault}
    return re.sub(r"\[[A-Z]+_\d+(?:_[A-Z]+)?\]", lambda m: lookup.get(m.group(0), m.group(0)), text)
