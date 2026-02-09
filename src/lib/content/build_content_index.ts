import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type PackCategory = { id: string; title: string };
export type PackLevel = { id: string; title: string };

export type PackManifest = {
  id: string;
  name: string;
  description?: string;
  categories: PackCategory[];
  levels: PackLevel[];
};

export type Skill = {
  /** Per-pack stable id (frontmatter `id`) */
  id: string;
  /** Pack id */
  packId: string;

  name: string;
  title?: string;

  /** Short description/excerpt (derived from MDX body) */
  description?: string;

  /** Legacy display fields (kept for backwards compatibility in UI) */
  quadrant: string;
  ring: string;

  /** Normalized ids (validated against pack manifest) */
  categoryId: string;
  levelId: string;

  order?: number;
  status?: string;

  requiresSkills: string[];

  /** Skill-to-skill graph edges: prerequisite skill ids. */
  prereqs: string[];

  taughtByUnits: string[];
  kitTags: string[];

  sourcePath: string;
};

export type Unit = {
  id: string;
  packId: string;
  title: string;
  summary?: string;
  teaches: string[];

  /** Optional metadata to make units feel like training, not prose */
  estimatedMinutes?: number;
  difficulty?: string;
  doneWhen?: string[];

  sourcePath: string;
};

export type SkillLink = {
  from: string;
  to: string;
  type: "prereq";
};

export type PackIndex = {
  manifest: PackManifest;
  skills: Skill[];
  skillsById: Record<string, Skill>;
  units: Unit[];
  unitsById: Record<string, Unit>;

  /** Derived skill graph edges for the pack. */
  skillLinks: SkillLink[];
};

export type ContentIndex = {
  generatedAt: string;

  /** Default pack to render when no pack is selected. */
  defaultPackId: string;

  /** All packs by id. */
  packs: Record<string, PackIndex>;

  /** Back-compat: skills for default pack. */
  skills: Skill[];
  skillsById: Record<string, Skill>;
};

function slugify(s: string): string {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function readJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
}

function extractDescriptionFromMdxBody(body: string): string | undefined {
  const blocks = String(body)
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/g)
    .map((b) => b.trim())
    .filter(Boolean);

  for (const b of blocks) {
    // Skip headings and obvious non-paragraph blocks
    if (b.startsWith("#")) continue;
    if (b.startsWith("-") || b.startsWith("*") || b.startsWith("1.")) continue;
    if (b.startsWith("```")) continue;

    const text = b
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (text.length >= 20) return text;
  }

  return undefined;
}

function readSkills(packId: string, skillsDir: string): Skill[] {
  const files = fs
    .readdirSync(skillsDir)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));

  const skills: Skill[] = [];

  for (const file of files) {
    const fullPath = path.join(skillsDir, file);
    const raw = fs.readFileSync(fullPath, "utf-8");
    const parsed = matter(raw);
    const d: any = parsed.data || {};

    const id = String(d.id || path.basename(file, path.extname(file)));
    const name = String(d.name || d.title || id);

    const quadrant = String(d.quadrant || "");
    const ring = String(d.ring || "");

    if (!d.id) {
      // eslint-disable-next-line no-console
      console.warn(`[${packId}] WARN skill missing frontmatter id, using filename: ${file}`);
    }
    if (d.type && d.type !== "skill") {
      throw new Error(`[${packId}] skill ${id} has invalid type='${d.type}' (expected 'skill')`);
    }
    if (!d.title && !d.name) {
      // eslint-disable-next-line no-console
      console.warn(`[${packId}] WARN skill ${id} missing title/name (${file})`);
    }

    const description = extractDescriptionFromMdxBody(parsed.content || "");

    skills.push({
      id,
      packId,
      name,
      title: d.title ? String(d.title) : undefined,
      description,
      quadrant,
      ring,
      categoryId: String(d.categoryId || slugify(quadrant)),
      levelId: String(d.levelId || slugify(ring)),
      order: typeof d.order === "number" ? d.order : d.order ? Number(d.order) : undefined,
      status: d.status ? String(d.status) : undefined,
      requiresSkills: Array.isArray(d.requiresSkills) ? d.requiresSkills.map(String) : [],
      prereqs: Array.isArray(d.prereqs) ? d.prereqs.map(String) : [],
      // IMPORTANT: taughtByUnits is computed from unit.teaches during indexing.
      taughtByUnits: [],
      kitTags: Array.isArray(d.kitTags) ? d.kitTags.map(String) : [],
      sourcePath: `content/packs/${packId}/skills/${file}`,
    });
  }

  return skills;
}

function readUnits(packId: string, unitsDir: string): Unit[] {
  if (!fs.existsSync(unitsDir)) return [];

  const files = fs
    .readdirSync(unitsDir)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));

  const units: Unit[] = [];

  for (const file of files) {
    const fullPath = path.join(unitsDir, file);
    const raw = fs.readFileSync(fullPath, "utf-8");
    const parsed = matter(raw);
    const d: any = parsed.data || {};

    const id = String(d.id || path.basename(file, path.extname(file)));
    const title = String(d.title || d.name || id);

    const teaches = Array.isArray(d.teaches) ? d.teaches.map(String) : [];

    if (!d.id) {
      // eslint-disable-next-line no-console
      console.warn(`[${packId}] WARN unit missing frontmatter id, using filename: ${file}`);
    }
    if (d.type && d.type !== "unit") {
      throw new Error(`[${packId}] unit ${id} has invalid type='${d.type}' (expected 'unit')`);
    }
    if (!d.title && !d.name) {
      throw new Error(`[${packId}] unit ${id} missing title/name (${file})`);
    }

    const estimatedMinutes =
      typeof d.estimatedMinutes === "number"
        ? d.estimatedMinutes
        : d.estimatedMinutes
          ? Number(d.estimatedMinutes)
          : undefined;

    units.push({
      id,
      packId,
      title,
      summary: d.summary ? String(d.summary) : undefined,
      teaches,
      estimatedMinutes: Number.isFinite(estimatedMinutes) ? estimatedMinutes : undefined,
      difficulty: d.difficulty ? String(d.difficulty) : undefined,
      doneWhen: Array.isArray(d.doneWhen) ? d.doneWhen.map(String) : undefined,
      sourcePath: `content/packs/${packId}/units/${file}`,
    });
  }

  return units;
}

function validatePack(manifest: PackManifest, skills: Skill[], units: Unit[]) {
  const categoryIds = new Set(manifest.categories.map((c) => c.id));
  const levelIds = new Set(manifest.levels.map((l) => l.id));

  const dupSkillIds = new Set<string>();
  const skillIds = new Set<string>();

  for (const s of skills) {
    if (!s.id) throw new Error(`[${manifest.id}] skill missing id (${s.sourcePath})`);

    if (dupSkillIds.has(s.id)) {
      throw new Error(`[${manifest.id}] duplicate skill id: ${s.id}`);
    }
    dupSkillIds.add(s.id);
    skillIds.add(s.id);

    // prereqs validated after ids collected

    if (!categoryIds.has(s.categoryId)) {
      throw new Error(
        `[${manifest.id}] skill ${s.id} has unknown categoryId '${s.categoryId}' (from quadrant='${s.quadrant}')`,
      );
    }

    if (!levelIds.has(s.levelId)) {
      throw new Error(
        `[${manifest.id}] skill ${s.id} has unknown levelId '${s.levelId}' (from ring='${s.ring}')`,
      );
    }
  }

  // Validate skill prereq links now that we have the full id set.
  for (const s of skills) {
    for (const p of s.prereqs ?? []) {
      if (!skillIds.has(p)) {
        throw new Error(
          `[${manifest.id}] skill ${s.id} has unknown prereq skill '${p}'. Check id spelling (source: ${s.sourcePath})`,
        );
      }
    }
  }

  const dupUnitIds = new Set<string>();
  for (const u of units) {
    if (!u.id) throw new Error(`[${manifest.id}] unit missing id (${u.sourcePath})`);
    if (dupUnitIds.has(u.id)) throw new Error(`[${manifest.id}] duplicate unit id: ${u.id}`);
    dupUnitIds.add(u.id);

    for (const t of u.teaches) {
      if (!skillIds.has(t)) {
        throw new Error(
          `[${manifest.id}] unit ${u.id} teaches unknown skill '${t}'. Check id spelling (source: ${u.sourcePath})`,
        );
      }
    }
  }
}

export function buildContentIndex(repoRoot: string): ContentIndex {
  const packsRoot = path.join(repoRoot, "content", "packs");

  const packIds = fs
    .readdirSync(packsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  if (packIds.length === 0) {
    throw new Error(`No content packs found at ${packsRoot}`);
  }

  const packs: Record<string, PackIndex> = {};

  for (const packId of packIds) {
    const packDir = path.join(packsRoot, packId);
    const manifestPath = path.join(packDir, "pack.json");
    const manifest = readJson<PackManifest>(manifestPath);

    const skillsDir = path.join(packDir, "skills");
    const unitsDir = path.join(packDir, "units");

    const skills = readSkills(packId, skillsDir);
    const units = readUnits(packId, unitsDir);

    validatePack(manifest, skills, units);

    const skillsById = Object.fromEntries(skills.map((s) => [s.id, s]));
    const unitsById = Object.fromEntries(units.map((u) => [u.id, u]));

    const skillLinks: SkillLink[] = [];
    for (const s of skills) {
      for (const p of s.prereqs ?? []) {
        // Edge direction: prereq -> skill
        skillLinks.push({ from: p, to: s.id, type: "prereq" });
      }
    }

    // Compute reverse index: skill.taughtByUnits
    for (const u of units) {
      for (const sid of u.teaches) {
        const s = skillsById[sid];
        if (s) s.taughtByUnits.push(u.id);
      }
    }

    const orphanSkills = skills.filter((s) => (s.taughtByUnits?.length ?? 0) === 0);
    if (orphanSkills.length) {
      // eslint-disable-next-line no-console
      console.warn(
        `[${packId}] WARN ${orphanSkills.length} skills are not taught by any units yet (example: ${orphanSkills[0].id})`,
      );
    }

    packs[packId] = {
      manifest,
      skills,
      skillsById,
      units,
      unitsById,
      skillLinks,
    };
  }

  // Default pack: env var override or first directory.
  const defaultPackId =
    process.env["RAFT_PACK"] && packs[process.env["RAFT_PACK"]]
      ? process.env["RAFT_PACK"]
      : packIds[0];

  return {
    generatedAt: new Date().toISOString(),
    defaultPackId,
    packs,
    skills: packs[defaultPackId].skills,
    skillsById: packs[defaultPackId].skillsById,
  };
}

if (require.main === module) {
  const repoRoot = process.cwd();
  const idx = buildContentIndex(repoRoot);
  const outPath = path.join(repoRoot, "content", "generated", "content-index.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(idx, null, 2), "utf-8");
  // eslint-disable-next-line no-console
  console.log(
    `Wrote packs=${Object.keys(idx.packs).length}, defaultPack=${idx.defaultPackId}, skills=${idx.skills.length} -> ${outPath}`,
  );
}
