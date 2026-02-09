#!/usr/bin/env python3
"""Convert prototyping-radar markdown items into MDX skills with explicit id.

Usage:
  python3 convert_radar_md_to_mdx.py \
    --src /Users/mattfielding/clawd/projects/prototyping-radar/data/items-md \
    --out /Users/mattfielding/clawd/projects/proto-learning-app/content/skills

Notes:
- Uses filename slug as stable id AND writes it into frontmatter as `id`.
- Renames `name` -> `name` kept; also adds `title` for convenience.
- Keeps ring/quadrant/order/status.
"""

import argparse
import pathlib
import re

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.S)


def parse_frontmatter(text: str):
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}, text
    raw = m.group(1)
    body = m.group(2)

    fm = {}
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if ':' not in line:
            continue
        k, v = line.split(':', 1)
        fm[k.strip()] = v.strip().strip('"')
    return fm, body


def dump_frontmatter(fm: dict) -> str:
    # stable order for readability
    keys = [
        'id', 'name', 'title', 'quadrant', 'ring', 'order', 'status',
        'requiresSkills', 'taughtByUnits', 'kitTags'
    ]
    lines = ['---']
    for k in keys:
        if k not in fm:
            continue
        v = fm[k]
        if isinstance(v, list):
            lines.append(f"{k}:")
            for item in v:
                lines.append(f"  - {item}")
        else:
            lines.append(f"{k}: {v}")
    # include any extras
    for k in sorted(set(fm.keys()) - set(keys)):
        v = fm[k]
        lines.append(f"{k}: {v}")
    lines.append('---')
    return "\n".join(lines) + "\n\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True)
    ap.add_argument('--out', required=True)
    args = ap.parse_args()

    src = pathlib.Path(args.src)
    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    count = 0
    for p in sorted(src.glob('*.md')):
        slug = p.stem
        txt = p.read_text(encoding='utf-8')
        fm, body = parse_frontmatter(txt)

        fm.setdefault('id', slug)
        fm.setdefault('name', fm.get('name', slug))
        fm.setdefault('title', fm.get('name', slug))

        # scaffold optional graph fields
        fm.setdefault('requiresSkills', [])
        fm.setdefault('taughtByUnits', [])
        fm.setdefault('kitTags', ['govuk', 'nhs'])

        new = dump_frontmatter(fm) + body.strip() + "\n"
        (out / f"{slug}.mdx").write_text(new, encoding='utf-8')
        count += 1

    print(f"Wrote {count} skills to {out}")


if __name__ == '__main__':
    main()
