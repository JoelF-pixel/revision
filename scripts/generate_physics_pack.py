#!/usr/bin/env python3
"""Generate gcse-physics-higher skills from AQA topic checklist PDFs.

- Creates hub skills for each spec subsection like 4.1.1, 4.2.2, etc.
- Creates child skills for each checklist subtopic heading under that subsection.
- Populates Self-assessment bullets from the checklist's "I can ..." lines.
- Adds a rough KO excerpt by searching in the KO PDF text (best-effort).

Run:
  uv run --with pypdf python3 scripts/generate_physics_pack.py
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "content/packs/gcse-physics-higher"
SKILLS = PACK / "skills"

CHECKLIST_DIR = Path("/Users/joelfielding/Downloads/Checklists")
KO_PDF = Path("/Users/joelfielding/Downloads/All physics knowledge organisers.pdf")

CATEGORY_BY_MAJOR = {
    "4.1": "p1-energy",
    "4.2": "p1-electricity",
    "4.3": "p1-particle-model",
    "4.4": "p1-atomic",
    "4.5": "p2-forces",
    "4.6": "p2-waves",
    "4.7": "p2-magnetism",
    "4.8": "p2-space",
}

LEVEL_ID = "higher-combined"
RING_TITLE = "Higher combined"
QUADRANT_P1 = "Paper 1"
QUADRANT_P2 = "Paper 2"


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.strip().lower()).strip("-")


def read_pdf_text(pdf_path: Path) -> str:
    r = PdfReader(str(pdf_path))
    parts = []
    for p in r.pages:
        t = p.extract_text() or ""
        parts.append(t)
    return "\n".join(parts)


def clean_line(s: str) -> str:
    s = re.sub(r"\s+", " ", s).strip()
    return s


@dataclass
class Subtopic:
    heading: str
    can_lines: list[str]


@dataclass
class Section:
    major: str  # e.g. 4.1
    code: str  # e.g. 4.1.1
    title: str
    subtopics: list[Subtopic]


def parse_checklist(text: str) -> list[Section]:
    lines = [clean_line(l) for l in text.splitlines()]
    lines = [l for l in lines if l]

    # Find the major heading like "4.1 Energy"
    major = None
    for l in lines[:20]:
        m = re.match(r"^(4\.[1-8])\b", l)
        if m:
            major = m.group(1)
            break
    if not major:
        raise ValueError("Could not detect major section (4.x) from checklist")

    sections: list[Section] = []

    # Sections start with 4.x.y followed by a title line (often on same line)
    sec_re = re.compile(rf"^({re.escape(major)}\.\d+)\s+(.*)$")

    i = 0
    while i < len(lines):
        m = sec_re.match(lines[i])
        if not m:
            i += 1
            continue
        code = m.group(1)
        title = m.group(2).strip()

        # Collect until next sec header
        i += 1
        block: list[str] = []
        while i < len(lines) and not sec_re.match(lines[i]):
            block.append(lines[i])
            i += 1

        # Within block, detect subtopic headings: lines that do not start with "I can" and aren't table labels.
        subtopics: list[Subtopic] = []
        current_heading = None
        current_can: list[str] = []

        def flush():
            nonlocal current_heading, current_can
            if current_heading and current_can:
                subtopics.append(Subtopic(current_heading, current_can))
            current_heading = None
            current_can = []

        for l in block:
            if l.lower().startswith("topic success") or l.lower().startswith("progress"):
                continue
            if l.lower().startswith("aqa gcse"):
                continue
            if l.lower().startswith("topic"):
                continue

            if re.match(r"^I can\b", l):
                if not current_heading:
                    current_heading = "Checklist"
                current_can.append(l)
                continue

            # treat short capitalised headings as subtopic
            if len(l) <= 60 and (l[0].isupper() and not l.lower().startswith("i can")):
                # if it looks like a heading and we've got some existing stuff, flush
                if current_heading and current_can:
                    flush()
                current_heading = l
                continue

        flush()

        if not subtopics:
            # fallback: put all I can lines in one
            can = [l for l in block if l.lower().startswith("i can")]
            if can:
                subtopics = [Subtopic("Checklist", can)]

        sections.append(Section(major=major, code=code, title=title, subtopics=subtopics))

    return sections


def ko_excerpt(ko_text: str, query: str, max_lines: int = 6) -> list[str]:
    q = query.lower()
    idx = ko_text.lower().find(q)
    if idx < 0:
        return []
    window = ko_text[idx : idx + 1200]
    lines = [clean_line(l) for l in window.splitlines() if clean_line(l)]
    # return first few non-empty lines excluding the exact query line if too long
    out: list[str] = []
    for l in lines:
        if len(out) >= max_lines:
            break
        if len(l) < 4:
            continue
        out.append(l)
    return out


def write_skill(path: Path, fm: dict[str, str], body: str) -> None:
    def y(s: str) -> str:
        # Quote if YAML-unsafe
        if any(ch in s for ch in [":", "—", "\""]):
            s2 = s.replace("\"", "\\\"")
            return f'"{s2}"'
        return s

    fm_lines = ["---"]
    for k, v in fm.items():
        if isinstance(v, str):
            fm_lines.append(f"{k}: {y(v)}")
        else:
            raise TypeError
    fm_lines.append("---")
    path.write_text("\n".join(fm_lines) + "\n\n" + body.strip() + "\n", encoding="utf-8")


def main():
    SKILLS.mkdir(parents=True, exist_ok=True)

    ko_text = read_pdf_text(KO_PDF)

    checklist_pdfs = [
        CHECKLIST_DIR / "AQA GCSE Physics Topic Checklists 4.1 Energy.pdf",
        CHECKLIST_DIR / "AQA GCSE Physics Topic Checklists 4.2 Electricity.pdf",
        CHECKLIST_DIR / "AQA GCSE Physics Topic Checklists 4.3 Particle Model of Matter.pdf",
        CHECKLIST_DIR / "AQA GCSE Physics Topic Checklists 4.4 Atomic Structure.pdf",
        CHECKLIST_DIR / "AQA GCSE Physics Topic Checklists 4.5 Forces.pdf",
        CHECKLIST_DIR / "AQA GCSE Physics Topic Checklists 4.6 Waves.pdf",
        CHECKLIST_DIR / "AQA GCSE Physics Topic Checklists 4.7 Magnetism and Electromagnetism.pdf",
        CHECKLIST_DIR / "AQA GCSE Physics Topic Checklists 4.8 Space Physics.pdf",
    ]

    order_base = 4000
    created = 0

    for pdf in checklist_pdfs:
        text = read_pdf_text(pdf)
        sections = parse_checklist(text)
        for sec in sections:
            cat = CATEGORY_BY_MAJOR.get(sec.major)
            if not cat:
                continue
            quadrant = QUADRANT_P1 if sec.major in {"4.1", "4.2", "4.3", "4.4"} else QUADRANT_P2

            hub_id = f"aqa-phys-{sec.code.replace('.', '-') }"
            hub_path = SKILLS / f"{hub_id}.mdx"
            if not hub_path.exists():
                write_skill(
                    hub_path,
                    {
                        "type": "skill",
                        "id": hub_id,
                        "title": f"{sec.code} {sec.title}",
                        "quadrant": quadrant,
                        "ring": RING_TITLE,
                        "categoryId": cat,
                        "levelId": LEVEL_ID,
                        "order": str(order_base),
                        "kitTags": "subsection",
                    },
                    f"**Spec reference:** {sec.code} (from AQA topic checklist).\n\n## Self-assessment (checklist)\n\n- Use the child dots for the detailed checklist for this section.\n",
                )
                created += 1
            order_base += 1

            for st_i, st in enumerate(sec.subtopics, start=1):
                leaf_id = f"{hub_id}-{st_i}-{slugify(st.heading)[:60]}"
                leaf_path = SKILLS / f"{leaf_id}.mdx"
                prereqs_block = f"prereqs:\n  - {hub_id}\n"

                # KO excerpt based on heading or sec title
                ko_q = st.heading if st.heading != "Checklist" else sec.title
                ex = ko_excerpt(ko_text, ko_q, max_lines=8)
                ex_md = "\n".join([f"- {l}" for l in ex]) if ex else "- *(KO snippet not found yet — we can map this manually.)*"

                checklist_md = "\n".join([f"- {c}" for c in st.can_lines])

                body = (
                    f"**Spec reference:** {sec.code} (subtopic).\n\n"
                    f"## What you need to know\n\n{ex_md}\n\n"
                    f"## Self-assessment (checklist)\n\n{checklist_md}\n\n"
                    "## Key steps (method)\n\n"
                    "- Identify what the question is testing and use the correct equation/definition.\n"
                    "- Show substitutions and units clearly.\n\n"
                    "## Common mistakes\n\n"
                    "- Unit conversions, rearranging errors, or quoting a law without applying it.\n"
                )

                # Write with prereqs already embedded in frontmatter (manual frontmatter so lists work).
                fm = (
                    "---\n"
                    f"type: skill\n"
                    f"id: {leaf_id}\n"
                    f"title: \"{sec.code} — {st.heading}\"\n"
                    f"quadrant: {quadrant}\n"
                    f"ring: {RING_TITLE}\n"
                    f"categoryId: {cat}\n"
                    f"levelId: {LEVEL_ID}\n"
                    f"order: {order_base}\n"
                    f"prereqs:\n  - {hub_id}\n"
                    "---\n\n"
                )
                leaf_path.write_text(fm + body.strip() + "\n", encoding="utf-8")

                created += 1
                order_base += 1

    print("created", created, "skills")


if __name__ == "__main__":
    main()
