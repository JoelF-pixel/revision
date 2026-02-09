export type UnitOrderFields = {
  id: string;
  title?: string;
  categoryId?: string;
  levelId?: string;
  order?: number;
};

export type PackManifest = {
  categories?: Array<{ id: string; title?: string }>;
  levels?: Array<{ id: string; title?: string }>;
};

function idxMap(xs: Array<{ id: string }> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = 0; i < (xs?.length ?? 0); i++) out[String(xs![i].id)] = i;
  return out;
}

export function makeUnitComparator(manifest?: PackManifest) {
  const categoryIdx = idxMap(manifest?.categories);
  const levelIdx = idxMap(manifest?.levels);

  return (a: UnitOrderFields, b: UnitOrderFields) => {
    const ac = a.categoryId ? categoryIdx[a.categoryId] : undefined;
    const bc = b.categoryId ? categoryIdx[b.categoryId] : undefined;

    // Units with known categoryId come first; otherwise sort later.
    if (ac !== undefined && bc === undefined) return -1;
    if (ac === undefined && bc !== undefined) return 1;
    if (ac !== undefined && bc !== undefined && ac !== bc) return ac - bc;

    const al = a.levelId ? levelIdx[a.levelId] : undefined;
    const bl = b.levelId ? levelIdx[b.levelId] : undefined;

    if (al !== undefined && bl === undefined) return -1;
    if (al === undefined && bl !== undefined) return 1;
    if (al !== undefined && bl !== undefined && al !== bl) return al - bl;

    const ao = typeof a.order === "number" && Number.isFinite(a.order) ? a.order : 9999;
    const bo = typeof b.order === "number" && Number.isFinite(b.order) ? b.order : 9999;
    if (ao !== bo) return ao - bo;

    return String(a.title ?? a.id).localeCompare(String(b.title ?? b.id));
  };
}
