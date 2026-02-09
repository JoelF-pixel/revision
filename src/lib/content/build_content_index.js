const fs = require("node:fs");
const path = require("node:path");
const matter = require("gray-matter");

function slugify(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function extractDescriptionFromMdxBody(body) {
  const blocks = String(body)
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/g)
    .map((b) => b.trim())
    .filter(Boolean);

  for (const b of blocks) {
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

function readSkills(packId, skillsDir) {
  const files = fs
    .readdirSync(skillsDir)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));

  const skills = [];

  for (const file of files) {
    const fullPath = path.join(skillsDir, file);
    const raw = fs.readFileSync(fullPath, "utf-8");
    const parsed = matter(raw);
    const d = parsed.data || {};

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
      // computed from unit.teaches
      taughtByUnits: [],
      kitTags: Array.isArray(d.kitTags) ? d.kitTags.map(String) : [],
      sourcePath: `content/packs/${packId}/skills/${file}`,
    });
  }

  return skills;
}

function readUnits(packId, unitsDir) {
  if (!fs.existsSync(unitsDir)) return [];

  const files = fs
    .readdirSync(unitsDir)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));

  const units = [];

  for (const file of files) {
    const fullPath = path.join(unitsDir, file);
    const raw = fs.readFileSync(fullPath, "utf-8");
    const parsed = matter(raw);
    const d = parsed.data || {};

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

    const order =
      typeof d.order === "number" ? d.order : d.order !== undefined && d.order !== null ? Number(d.order) : undefined;

    units.push({
      id,
      packId,
      title,
      summary: d.summary ? String(d.summary) : undefined,
      teaches,
      estimatedMinutes: Number.isFinite(estimatedMinutes) ? estimatedMinutes : undefined,
      difficulty: d.difficulty ? String(d.difficulty) : undefined,
      // Optional ordering fields (mirrors skills ordering)
      categoryId: d.categoryId ? String(d.categoryId) : undefined,
      levelId: d.levelId ? String(d.levelId) : undefined,
      order: Number.isFinite(order) ? order : undefined,
      doneWhen: Array.isArray(d.doneWhen) ? d.doneWhen.map(String) : undefined,
      sourcePath: `content/packs/${packId}/units/${file}`,
    });
  }

  return units;
}

function validatePack(manifest, skills, units) {
  const categoryIds = new Set((manifest.categories || []).map((c) => c.id));
  const levelIds = new Set((manifest.levels || []).map((l) => l.id));

  const dupSkillIds = new Set();
  const skillIds = new Set();

  for (const s of skills) {
    if (!s.id) throw new Error(`[${manifest.id}] skill missing id (${s.sourcePath})`);
    if (dupSkillIds.has(s.id)) throw new Error(`[${manifest.id}] duplicate skill id: ${s.id}`);
    dupSkillIds.add(s.id);
    skillIds.add(s.id);

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
    for (const p of s.prereqs || []) {
      if (!skillIds.has(p)) {
        throw new Error(
          `[${manifest.id}] skill ${s.id} has unknown prereq skill '${p}'. Check id spelling (source: ${s.sourcePath})`,
        );
      }
    }
  }

  const dupUnitIds = new Set();
  for (const u of units) {
    if (!u.id) throw new Error(`[${manifest.id}] unit missing id (${u.sourcePath})`);
    if (dupUnitIds.has(u.id)) throw new Error(`[${manifest.id}] duplicate unit id: ${u.id}`);
    dupUnitIds.add(u.id);

    if (u.categoryId && !categoryIds.has(u.categoryId)) {
      throw new Error(
        `[${manifest.id}] unit ${u.id} has unknown categoryId '${u.categoryId}' (source: ${u.sourcePath})`,
      );
    }

    if (u.levelId && !levelIds.has(u.levelId)) {
      throw new Error(
        `[${manifest.id}] unit ${u.id} has unknown levelId '${u.levelId}' (source: ${u.sourcePath})`,
      );
    }

    for (const t of u.teaches) {
      if (!skillIds.has(t)) {
        throw new Error(
          `[${manifest.id}] unit ${u.id} teaches unknown skill '${t}'. Check id spelling (source: ${u.sourcePath})`,
        );
      }
    }
  }
}

function buildContentIndex(repoRoot) {
  const packsRoot = path.join(repoRoot, "content", "packs");
  const packIds = fs
    .readdirSync(packsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  if (packIds.length === 0) {
    throw new Error(`No content packs found at ${packsRoot}`);
  }

  const packs = {};

  for (const packId of packIds) {
    const packDir = path.join(packsRoot, packId);
    const manifestPath = path.join(packDir, "pack.json");
    const manifest = readJson(manifestPath);

    const skillsDir = path.join(packDir, "skills");
    const unitsDir = path.join(packDir, "units");

    const skills = readSkills(packId, skillsDir);
    const units = readUnits(packId, unitsDir);

    validatePack(manifest, skills, units);

    const skillsById = Object.fromEntries(skills.map((s) => [s.id, s]));
    const unitsById = Object.fromEntries(units.map((u) => [u.id, u]));

    const skillLinks = [];
    for (const s of skills) {
      for (const p of s.prereqs || []) {
        skillLinks.push({ from: p, to: s.id, type: "prereq" });
      }
    }

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

    packs[packId] = { manifest, skills, skillsById, units, unitsById, skillLinks };
  }

  const envPack = process.env.RAFT_PACK;
  const defaultPackId = envPack && packs[envPack] ? envPack : "govuk-prototyping";

  return {
    generatedAt: new Date().toISOString(),
    defaultPackId,
    packs,
    skills: packs[defaultPackId]?.skills ?? [],
    skillsById: packs[defaultPackId]?.skillsById ?? {},
  };
}

const repoRoot = process.cwd();
const idx = buildContentIndex(repoRoot);
const outPath = path.join(repoRoot, "content", "generated", "content-index.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(idx, null, 2), "utf-8");
console.log(
  `Wrote packs=${Object.keys(idx.packs).length}, defaultPack=${idx.defaultPackId}, skills=${idx.skills.length} -> ${outPath}`,
);
