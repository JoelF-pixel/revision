# RAFT — Pack-based learning app

RAFT is a skill-first learning + reference app built on **Next.js App Router**.

It’s **pack-based**: each pack defines its own categories/levels and includes its own skills + lessons. Packs are addressed via routes like:

- `/p/<packId>` (pack home)
- `/p/<packId>/skills` (skills list + skills tree + side panel)
- `/p/<packId>/lessons` (lesson list)
- `/p/<packId>/plan` (personalised plan — requires sign-in)

## How the app works (at a glance)

- **Browse without signing in:** skills + lessons are public.
- **Sign in with Google to track progress:** ratings and lesson completion are stored per user.
- **Skills is the hub:**
  - list view with a right-hand detail panel
  - “Skills tree” view
  - (optional) wizard for first-time assessment
- **My plan** is generated from your ratings + progress.

## Packs + content model

Packs live in `content/packs/<packId>/` and are defined by a `pack.json` manifest:

- categories (ordering + titles)
- levels (ordering + titles)

Content is authored as MDX and indexed into:

- `content/generated/content-index.json`

Current packs in this repo:
- `govuk-prototyping` (default)
- `skills-for-content-designers`

## What’s in this repo

- Next.js app in `src/app/*`
- Pack manifests in `content/packs/*/pack.json`
- Generated pack index in `content/generated/content-index.json` (built step)
- Auth via NextAuth + Prisma adapter
- DB via Prisma (Postgres in local dev)

## Quickstart (local dev)

### 1) Install deps

```bash
npm install
```

### 2) Configure env vars

Create **`.env.local`** (recommended) or `.env` (ignored by git).

Minimum required variables depend on what you enable:

**Database (Prisma)**
- `DATABASE_URL=postgresql://USER@localhost:5432/proto_learning_app?schema=public`

**Auth (NextAuth)**
- `AUTH_SECRET=...` (generate: `openssl rand -hex 32`)
- `NEXTAUTH_URL=http://localhost:3099`

**Google OAuth (optional)**
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`
- `GOOGLE_WORKSPACE_DOMAIN=hippodigital.co.uk` (optional allowlist)

> Security: **Never commit real secrets.** `.env*` is ignored by git.

### 3) Run the dev server

```bash
npm run dev -- -p 3099
```

- Local: http://localhost:3099

## Content authoring (MDX)

Each pack can include MDX skills and lessons/units. The build step indexes everything and validates references.

Useful folders:
- `content/packs/<packId>/pack.json` — pack manifest (categories + levels)
- `content/packs/<packId>/skills/*.mdx` — skill pages
- `content/packs/<packId>/units/*.mdx` — lesson/unit pages

### Build the content index

```bash
npm run build:content
```

Writes:
- `content/generated/content-index.json`

## Contributing

### Workflow

1) Create a branch from `main`:
```bash
git checkout -b yourname/short-description
```

2) Make changes (code and/or MDX).

3) Run checks:
```bash
npm run lint
npm run build
```

4) Open a PR.

### What makes a good PR here

- **Small, coherent changes** (one theme per PR)
- MDX updates include:
  - clear titles + headings
  - runnable/copyable code
  - links to related skills/pages
- If you add new env vars, update this README.

### Commit attribution

Commits should be authored by the contributor (your Git identity). If you don’t want your email public, use GitHub’s `@users.noreply.github.com` address.

## Roadmap

### Phase 1 — MVP (now)
- Skill-first navigation (categories + levels)
- Skill pages with MDX-backed “how to” content
- Search/browse for skills
- Basic self-assessment + persisted ratings

### Phase 2 — Knowledge graph + learning plans
- Cross-linking between skills/pages (backlinks + “related”) based on metadata and links
- Learning plans (gap → suggested pages + small tasks)
- “Capstone” tasks per level

### Phase 3 — Contributions + quality
- Editorial workflow (labels, review states)
- Versioning/changelog for content
- Stronger content linting (broken links, missing metadata)

### Phase 4 — Wider rollout
- Optional public mode (auth off / limited)
- Export/share learning plans

## Getting help

- Issues/requests: open a GitHub issue with screenshots + reproduction steps.
- For new skills/content: propose the skill name + level + category and link to any source material.
