#!/usr/bin/env python3
"""Fill Sparx GCSE Maths dot pages with topic-specific 'Key steps' and 'Common mistakes'.

This overwrites the boilerplate sections only:
- '## Key steps (method)' bullet list
- '## Common mistakes' bullet list

It leaves everything else (videos, revision links, etc.) untouched.

Usage:
  python3 scripts/fill_maths_methods.py [--dry-run] [--limit N]
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

PACK_DIR = Path("content/packs/gcse-maths/skills")

FRONTMATTER_TITLE_RE = re.compile(r"^title:\s*(.+?)\s*$", re.MULTILINE)

KEY_STEPS_HDR = "## Key steps (method)"
MISTAKES_HDR = "## Common mistakes"

SECTION_RE = re.compile(
    r"(?s)\n## Key steps \(method\)\n\n(?P<steps>.*?)(?=\n## Common mistakes\n)"
    r"\n## Common mistakes\n\n(?P<mistakes>.*?)(?=\n## |\n\Z)"
)


def bullets(lines: list[str]) -> str:
    return "\n".join(f"- {ln}" for ln in lines) + "\n"


def gen_for_title(title: str) -> tuple[list[str], list[str]]:
    t = title.strip()
    tl = t.lower()

    # Keyword-driven micro-snippets to avoid “stock” content even for niche titles.
    # These are blended into a generic structure when no strong topic template matches.
    STEP_SNIPS: list[tuple[str, list[str]]] = [
        ("estimate", [
            "Round values sensibly (often 1 s.f. / 2 s.f.) to make mental arithmetic easy.",
            "Use easy compatible numbers and keep track of whether your estimate should be an over/under estimate.",
            "Compare your estimate to the exact answer (if you later calculate it) to check it’s plausible.",
        ]),
        ("measur", [
            "Write the units you’re measuring in and convert first if needed (mm↔cm↔m, g↔kg, etc.).",
            "If using a diagram/scale, measure carefully and apply the scale factor before answering.",
        ]),
        ("round", [
            "Identify the required accuracy (dp / s.f. / nearest unit) and round at the final step.",
            "If bounds are needed, write the lower/upper bound using ± half the rounding unit.",
        ]),
        ("bound", [
            "Write down lower and upper bounds for each rounded value.",
            "For max/min results: multiply/divide using the appropriate combination of bounds.",
        ]),
        ("ratio", [
            "Simplify the ratio and check it’s in the same units first.",
            "Turn the ratio into ‘parts’, then find 1 part and scale up.",
        ]),
        ("proportion", [
            "Decide whether it’s direct (y = kx) or inverse (y = k/x) proportion.",
            "Find k using a known pair, then substitute the new value.",
        ]),
        ("speed", [
            "Use **speed = distance ÷ time** and make sure units match (e.g. hours vs minutes).",
        ]),
        ("density", [
            "Use **density = mass ÷ volume** and convert units (cm³ vs m³) if required.",
        ]),
        ("pressure", [
            "Use **pressure = force ÷ area** and keep area units consistent.",
        ]),
        ("bear", [
            "Bearings are measured **clockwise from North** and written as 3 digits (e.g. 045°).",
        ]),
        ("scale", [
            "Write the scale as a multiplier (or a ratio) and apply it consistently to lengths (and areas/volumes if asked).",
        ]),
        ("vector", [
            "Represent vectors with arrows/column form and add/subtract component-wise.",
        ]),
        ("inequal", [
            "Remember: multiplying/dividing by a negative **reverses** the inequality sign.",
        ]),
    ]

    MISTAKE_SNIPS: list[tuple[str, list[str]]] = [
        ("estimate", [
            "Rounding in a way that makes the estimate meaningless (e.g. rounding some up and some down without thinking).",
            "Forgetting whether your rounding makes the result an overestimate or underestimate.",
        ]),
        ("measur", [
            "Unit conversion slips (cm vs m; minutes vs hours).",
            "Reading the wrong mark on a scale or not applying the given scale factor.",
        ]),
        ("round", [
            "Rounding too early in multi-step problems.",
            "Mixing up decimal places and significant figures.",
        ]),
        ("bound", [
            "Using ±1 instead of ±0.5 of the rounding unit for bounds.",
            "Using the wrong combination of bounds for max/min.",
        ]),
        ("ratio", [
            "Not simplifying before sharing or scaling.",
            "Assigning the parts to the wrong person/item.",
        ]),
        ("proportion", [
            "Treating inverse proportion as direct (or vice versa).",
        ]),
        ("bear", [
            "Measuring bearings from the wrong direction (not from North, not clockwise).",
            "Not using 3 digits (e.g. writing 40° instead of 040°).",
        ]),
        ("scale", [
            "Applying a linear scale factor to area/volume without squaring/cubing when required.",
        ]),
        ("vector", [
            "Mixing up direction/sign of components.",
        ]),
    ]

    def generic() -> tuple[list[str], list[str]]:
        steps = [
            f"Write down the given information and what you are asked to find for **{t}**.",
            "Choose a representation that fits the topic (diagram / table / algebra / graph) and set it up neatly.",
            "Apply the topic rule(s) step-by-step, showing enough working to keep method marks.",
            "Substitute values carefully (watch brackets, negatives, and order).",
            "Write the final answer clearly with correct units/rounding.",
            "Do a quick check that the answer is sensible for the context.",
        ]
        mistakes = [
            "Using the right idea but the wrong rule/interpretation for the topic.",
            "Skipping key working so method marks can’t be awarded.",
            "Sign/bracket errors when substituting or rearranging.",
            "Rounding too early or to the wrong accuracy.",
            "Not checking whether the answer is reasonable.",
        ]

        # Inject 1–3 keyword-specific snippets so each dot looks genuinely different.
        extra_steps: list[str] = []
        for key, snips in STEP_SNIPS:
            if key in tl:
                extra_steps.extend(snips)
        extra_mistakes: list[str] = []
        for key, snips in MISTAKE_SNIPS:
            if key in tl:
                extra_mistakes.extend(snips)

        if extra_steps:
            # Insert after setup step.
            steps = steps[:2] + extra_steps[:3] + steps[2:]
        if extra_mistakes:
            mistakes = extra_mistakes[:3] + mistakes

        # Keep to “medium-ish” length.
        steps = steps[:10]
        mistakes = mistakes[:10]
        return steps, mistakes

    # Probability: tree diagrams
    if "tree diagram" in tl:
        independent = re.search(r"\bindependent\b", tl) is not None
        dependent = (re.search(r"\bdependent\b", tl) is not None) or ("without replacement" in tl)
        steps = [
            "Draw the tree with a clear first stage, then the second stage (and more stages if needed).",
            "Label each branch with a probability. For each split, the branch probabilities must add to **1**.",
            "If the events are **dependent**, update the second-stage probabilities using the new totals (e.g. after taking one out)." if dependent else
            "If the events are **independent**, keep the same probabilities on later stages (they don’t change)." if independent else
            "Decide whether probabilities change between stages (dependent) or stay the same (independent).",
            "For an AND question, **multiply** along the branches of the relevant path.",
            "For an OR question, find each relevant path probability then **add** them.",
            "Write the final probability as a simplified fraction/decimal and sanity-check it’s between 0 and 1.",
        ]
        mistakes = [
            "Not making each split add to **1** (missing outcomes or incorrect complements).",
            "Mixing up **AND** (multiply along a path) and **OR** (add different paths).",
            "For dependent events, forgetting to change the second-stage probabilities (e.g. after ‘without replacement’).",
            "Dropping or double-counting paths when more than one outcome satisfies the question.",
            "Arithmetic errors when multiplying fractions/decimals.",
        ]
        return steps, mistakes

    # Indices / powers
    if any(k in tl for k in ["indices", "index", "powers", "standard form", "scientific notation"]):
        if "standard form" in tl or "scientific" in tl:
            steps = [
                "Write the number in the form **a × 10^n** where **1 ≤ a < 10**.",
                "Move the decimal point so the leading number is between 1 and 10.",
                "Count how many places the decimal moved: left → positive power, right → negative power.",
                "For calculations, multiply/divide the **a** parts and add/subtract the **powers of 10**.",
                "Convert back to an ordinary number only at the end if asked.",
            ]
            mistakes = [
                "Using an **a** value not between 1 and 10 (e.g. 54 × 10^3).",
                "Getting the sign of the power wrong (moving decimal left vs right).",
                "Mixing up adding powers (×) with subtracting powers (÷).",
                "Rounding too early when asked for a specific number of significant figures.",
            ]
            return steps, mistakes
        else:
            steps = [
                "Write everything in index form where possible.",
                "Use index laws: multiply → add powers, divide → subtract powers, power of a power → multiply powers.",
                "Handle negative and zero indices: **a^0 = 1**, **a^{-n} = 1/a^n**.",
                "Simplify coefficients and collect like terms carefully.",
                "Check by substituting an easy number (e.g. a = 2) if you’re unsure.",
            ]
            mistakes = [
                "Adding powers when you should subtract (or vice versa).",
                "Forgetting that **a^0 = 1** (for a ≠ 0).",
                "Leaving negative indices when the question expects positive powers.",
                "Applying index laws to sums (e.g. (a+b)^2 ≠ a^2+b^2).",
            ]
            return steps, mistakes

    # Expanding / factorising / simplifying algebra
    if any(k in tl for k in ["expand", "expanding", "simplify", "simplifying", "factor", "factorise", "factorising", "collect like terms"]):
        steps = [
            "Remove brackets carefully (multiply each term inside by the factor outside).",
            "If there are two brackets, use a systematic method (grid/FOIL) to multiply every term.",
            "Collect like terms (same letters with same powers).",
            "If factorising: take out the highest common factor first, then look for special patterns (difference of two squares, perfect square, etc.).",
            "Quick check by expanding your factorised answer to see if you get back to the original.",
        ]
        mistakes = [
            "Forgetting to multiply **every** term when expanding brackets.",
            "Sign errors, especially with negatives (e.g. −3(2x−5)).",
            "Combining unlike terms (e.g. 2x + 3x^2).",
            "Factorising only partially (missing a common factor).",
        ]
        return steps, mistakes

    # Solving equations
    if any(k in tl for k in ["solve", "solving", "equation", "inequality", "rearrange", "rearranging", "change the subject"]):
        if "simultaneous" in tl:
            steps = [
                "Write the two equations neatly and decide on **elimination** or **substitution**.",
                "If eliminating, multiply one/both equations so one variable has matching coefficients.",
                "Add/subtract the equations to eliminate that variable.",
                "Solve the resulting single-variable equation.",
                "Substitute back to find the other variable.",
                "Check both values satisfy **both** original equations.",
            ]
            mistakes = [
                "Multiplying one side of an equation but forgetting to multiply the other side.",
                "Sign mistakes when subtracting equations.",
                "Forgetting to substitute back for the second variable.",
                "Not checking the solution in both equations.",
            ]
            return steps, mistakes

        if "quadratic" in tl:
            steps = [
                "Rearrange into the form **ax² + bx + c = 0**.",
                "Choose a method: factorise (if possible), complete the square, or use the quadratic formula.",
                "Solve for x, giving both solutions if there are two.",
                "If using the quadratic formula, substitute carefully and simplify.",
                "Check by substituting solutions back into the original equation.",
            ]
            mistakes = [
                "Forgetting there are often **two** solutions.",
                "Sign errors in the quadratic formula (especially −b ± √…).",
                "Factorising incorrectly (wrong pair of factors).",
                "Losing solutions when taking square roots (missing ±).",
            ]
            return steps, mistakes

        if "inequality" in tl:
            steps = [
                "Treat it like solving an equation: collect like terms and isolate the variable.",
                "If you multiply/divide by a **negative**, **flip** the inequality sign.",
                "Write the solution clearly (as a range or with inequality symbols).",
                "If needed, show it on a number line and use open/closed circles correctly.",
                "Check with a test value inside/outside the range.",
            ]
            mistakes = [
                "Forgetting to **flip** the sign when ×/÷ by a negative.",
                "Mixing up strict vs non-strict signs (< vs ≤).",
                "Plotting endpoints incorrectly on a number line.",
            ]
            return steps, mistakes

        # Linear / rearranging
        steps = [
            "Simplify both sides first (remove brackets and collect like terms).",
            "Get all the x terms on one side and constants on the other.",
            "Use inverse operations step-by-step (undo +/− then ×/÷).",
            "If there are fractions, clear them by multiplying through by the LCM of denominators.",
            "Check by substituting your answer back into the original.",
        ]
        mistakes = [
            "Doing different operations to the two sides of the equation.",
            "Sign errors when moving terms across the equals sign.",
            "Dropping brackets or mis-handling negatives.",
            "Not checking the final answer.",
        ]
        return steps, mistakes

    # Fractions / percentages / ratio / proportion
    if any(k in tl for k in ["fraction", "fractions", "percentage", "percent", "ratio", "proportion", "directly proportion", "inverse proportion", "best value"]):
        if "ratio" in tl:
            steps = [
                "Write the ratio clearly and simplify it (divide all parts by the highest common factor).",
                "If sharing a quantity, add the ratio parts to get the total number of parts.",
                "Find the value of **1 part** by dividing the total by the number of parts.",
                "Multiply to find each share.",
                "Check the shares add back to the original total.",
            ]
            mistakes = [
                "Not simplifying the ratio before using it.",
                "Forgetting to add the parts before dividing.",
                "Mixing up which person/item gets which number of parts.",
            ]
            return steps, mistakes

        if "percentage" in tl or "percent" in tl:
            steps = [
                "Convert the percentage to a multiplier (e.g. +12% → ×1.12, −15% → ×0.85).",
                "For percentage of an amount, multiply the amount by the percentage as a decimal.",
                "For reverse percentages, divide by the multiplier to get the original amount.",
                "Keep money calculations to 2 d.p. at the end.",
                "Check: does increase/decrease direction match the question?",
            ]
            mistakes = [
                "Using ×0.12 instead of ×1.12 for an increase (or similar).",
                "Mixing up reverse percentage (dividing by the percentage instead of the multiplier).",
                "Rounding too early in multi-step percentage problems.",
            ]
            return steps, mistakes

        if "fraction" in tl:
            steps = [
                "Simplify fractions where possible before doing any calculations.",
                "To add/subtract: use a common denominator, then combine numerators.",
                "To multiply: multiply numerators and denominators (cancel common factors first).",
                "To divide: multiply by the reciprocal.",
                "Convert improper fractions to mixed numbers only at the end if asked.",
            ]
            mistakes = [
                "Adding denominators when adding fractions (you don’t).",
                "Forgetting to use the reciprocal when dividing.",
                "Not simplifying/cancelling, leading to messy arithmetic mistakes.",
            ]
            return steps, mistakes

    # Pythagoras / trig
    if any(k in tl for k in ["pythag", "pythagoras", "trigon", "sine", "cosine", "tangent", "sohcahtoa"]):
        if any(k in tl for k in ["sine", "cosine", "tangent", "sohcahtoa", "trig"]):
            steps = [
                "Draw and label the right-angled triangle (mark the right angle).",
                "Pick the trig ratio using SOHCAHTOA based on the sides you know/need.",
                "Substitute values and solve (use inverse trig for angles).",
                "Round appropriately (usually 1 d.p. for lengths, 1 d.p. for angles unless told otherwise).",
                "Check: does the angle/length look sensible for the triangle?",
            ]
            mistakes = [
                "Choosing the wrong sides (opposite/adjacent relative to the angle).",
                "Using sin/cos/tan on a non-right-angled triangle (unless using sine/cosine rule, etc.).",
                "Calculator in the wrong mode (degrees vs radians).",
                "Rounding too early.",
            ]
            return steps, mistakes
        else:
            steps = [
                "Write down **a² + b² = c²** (c is the hypotenuse).",
                "Identify the hypotenuse correctly (the side opposite the right angle).",
                "Substitute the known lengths and solve for the unknown.",
                "If you’re finding a shorter side, rearrange: a² = c² − b².",
                "Check the result is sensible (hypotenuse should be the longest).",
            ]
            mistakes = [
                "Using the wrong side as the hypotenuse.",
                "Adding instead of subtracting when finding a shorter side.",
                "Forgetting to square-root at the end.",
            ]
            return steps, mistakes

    # Area/volume/perimeter
    if any(k in tl for k in ["area", "perimeter", "volume", "surface area", "circumference", "radius", "diameter"]):
        steps = [
            "Write down the relevant formula(s) for the shape(s) involved.",
            "Convert units if needed (e.g. cm to m) before substituting.",
            "Substitute carefully (use radius vs diameter correctly).",
            "Calculate step-by-step and keep π on the calculator until the end if allowed.",
            "Give the final answer with correct units (cm² for area, cm³ for volume).",
        ]
        mistakes = [
            "Mixing up radius and diameter (or forgetting to halve/double).",
            "Using area units (²) when it’s volume (³), or vice versa.",
            "Not converting units (e.g. mm² vs cm²).",
            "Rounding π too early.",
        ]
        return steps, mistakes

    # Angles
    if "angles" in tl or "angle" in tl:
        steps = [
            "Mark the given angles clearly on the diagram.",
            "Use the correct angle facts (straight line 180°, around a point 360°, triangle 180°, parallel line rules, etc.).",
            "Work step-by-step, stating the reason for each angle you find.",
            "If algebraic, set up an equation using the angle rule then solve.",
            "Check the size is sensible for the diagram.",
        ]
        mistakes = [
            "Using the wrong angle rule (e.g. confusing corresponding and alternate angles).",
            "Not justifying steps — missing easy method marks.",
            "Arithmetic/sign errors when solving the resulting equation.",
        ]
        return steps, mistakes

    # Stats basics
    if any(k in tl for k in ["mean", "median", "mode", "range", "frequency", "histogram", "cumulative frequency", "box plot", "scatter", "correlation"]):
        steps = [
            "Identify what statistic/graph the question is asking for.",
            "Organise the data (frequency table if needed) and total the frequencies.",
            "Apply the correct method: mean = sum(f×x)/sum(f), median from ordered positions, etc.",
            "Read graphs carefully using the scales (including class boundaries for grouped data).",
            "State the answer clearly, with appropriate rounding.",
        ]
        mistakes = [
            "Using midpoints incorrectly for grouped data.",
            "Reading the wrong scale or misreading class boundaries.",
            "Forgetting to divide by total frequency when finding the mean.",
            "Mixing up correlation with causation in interpretations.",
        ]
        return steps, mistakes

    return generic()


def rewrite_file(path: Path, dry_run: bool = False) -> bool:
    txt = path.read_text(encoding="utf-8")
    mtitle = FRONTMATTER_TITLE_RE.search(txt)
    if not mtitle:
        return False
    title = mtitle.group(1).strip().strip('"')

    m = SECTION_RE.search(txt)
    if not m:
        return False

    steps, mistakes = gen_for_title(title)

    replacement = (
        f"\n{KEY_STEPS_HDR}\n\n"
        f"{bullets(steps)}\n"
        f"{MISTAKES_HDR}\n\n"
        f"{bullets(mistakes)}"
    )

    new_txt = SECTION_RE.sub(replacement, txt, count=1)
    if new_txt == txt:
        return False

    if not dry_run:
        path.write_text(new_txt, encoding="utf-8")
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=None)
    args = ap.parse_args()

    files = sorted(PACK_DIR.glob("sparx-u*.mdx"))
    if args.limit is not None:
        files = files[: args.limit]

    changed = 0
    skipped = 0
    for p in files:
        ok = rewrite_file(p, dry_run=args.dry_run)
        if ok:
            changed += 1
        else:
            skipped += 1

    print(f"files: {len(files)}  changed: {changed}  skipped: {skipped}  dry_run: {args.dry_run}")


if __name__ == "__main__":
    main()
