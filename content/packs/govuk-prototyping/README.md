# GOV.UK / NHS Prototyping Kit (Content Pack)

This folder is a **content pack** for RAFT.

- Pack id: `govuk-prototyping`
- Manifest: `./pack.json`
- Skills: `./skills/*.mdx`
- Units: `./units/*.mdx`

## Contributing content

### 1) Add / edit a skill

Create a file in `skills/`:

```mdx
---
id: what-is-routing            # REQUIRED (unique within this pack)
name: What is routing?          # Optional (display name)
title: What is routing?         # Recommended
quadrant: Pages and Layouts      # Used for legacy display + default categoryId
ring: Working                    # Used for legacy display + default levelId
order: 10                        # Optional ordering within category+level
kitTags: [govuk, nhs]            # Optional
requiresSkills: []               # Optional
---

# Content

...
```

**Notes**
- `categoryId` and `levelId` are derived from `quadrant`/`ring` by default (slugified). You can override with explicit `categoryId` / `levelId`.
- Skills are the taxonomy spine. Units should point at skills via `teaches`.

### 2) Add / edit a unit

Create a file in `units/`:

```mdx
---
id: unit.check-your-details     # REQUIRED (unique within this pack)
type: unit                       # Recommended
title: Check your details (pattern)
summary: Implement a realistic check-your-answers page.

# Optional training metadata
estimatedMinutes: 45
# Suggested values: working | practitioner | expert (or anything you prefer)
difficulty: working
# Completion criteria (strings shown in the UI)
doneWhen:
  - "User can review answers"
  - "Change links return to summary"

teaches:
  - linking-pages
  - redirecting-with-logic
---

## Goal
...
```

**Rules**
- Every entry in `teaches` must match an existing skill `id` in this pack.

### 3) Validate locally

Run:

```bash
npm run build:content
npm run build
```

The build will fail if:
- ids are duplicated
- units reference unknown skills
- skills reference unknown categories/levels

## Manifest: categories + levels

`pack.json` defines the order and labels for categories and levels. The UI uses this ordering.
