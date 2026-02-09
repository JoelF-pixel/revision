"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

type Skill = {
  id: string;
  name?: string;
  quadrant?: string;
  ring?: string;
  categoryId?: string;
  levelId?: string;
};

type Manifest = {
  categories?: { id: string; title?: string }[];
  levels?: { id: string; title?: string }[];
};

export function SkillListWithRatings({
  packId,
  skills,
  selectedSkillId,
  categoryId,
  sort,
  manifest,
  skillNumberById,
}: {
  packId: string;
  skills: Skill[];
  selectedSkillId?: string | null;
  categoryId?: string | null;
  sort?: string | null;
  manifest?: Manifest;
  skillNumberById?: Record<string, number>;
}) {
  const router = useRouter();

  const rows = useMemo(() => {
    const paramsBase = new URLSearchParams();
    paramsBase.set("view", "list");
    if (categoryId) paramsBase.set("categoryId", String(categoryId));
    if (sort) paramsBase.set("sort", String(sort));

    return skills.map((s) => {
      const id = String(s.id);
      const isSelected = !!selectedSkillId && String(selectedSkillId) === id;
      const params = new URLSearchParams(paramsBase);
      params.set("skillId", id);
      const href = `/p/${packId}/skills?${params.toString()}`;
      return { s, id, isSelected, href };
    });
  }, [skills, selectedSkillId, packId, categoryId, sort]);

  const categoryTitleById = useMemo(() => {
    return Object.fromEntries((manifest?.categories ?? []).map((c) => [String(c.id), String(c.title ?? c.id)]));
  }, [manifest]);

  const levelTitleById = useMemo(() => {
    return Object.fromEntries((manifest?.levels ?? []).map((l) => [String(l.id), String(l.title ?? l.id)]));
  }, [manifest]);

  const groups = useMemo(() => {
    const mode = sort || "category";

    if (mode === "level") {
      const out: { key: string; title: string; items: typeof rows }[] = [];
      const byKey: Record<string, typeof rows> = {};

      for (const r of rows) {
        const key = String((r.s as any).levelId ?? "").trim() || "unknown";
        byKey[key] ||= [];
        byKey[key].push(r);
      }

      const orderedKeys = (manifest?.levels ?? []).map((l) => String(l.id));
      const used = new Set<string>();
      for (const k of orderedKeys) {
        if (!byKey[k]?.length) continue;
        used.add(k);
        out.push({ key: k, title: levelTitleById[k] ?? k, items: byKey[k] });
      }
      for (const k of Object.keys(byKey)) {
        if (used.has(k)) continue;
        out.push({ key: k, title: levelTitleById[k] ?? k, items: byKey[k] });
      }
      return out;
    }

    if (mode === "category" || mode === "quadrants") {
      const out: { key: string; title: string; items: typeof rows }[] = [];
      const byKey: Record<string, typeof rows> = {};

      for (const r of rows) {
        const key = String((r.s as any).categoryId ?? "").trim() || "uncategorised";
        byKey[key] ||= [];
        byKey[key].push(r);
      }

      const orderedKeys = (manifest?.categories ?? []).map((c) => String(c.id));
      const used = new Set<string>();
      for (const k of orderedKeys) {
        if (!byKey[k]?.length) continue;
        used.add(k);
        out.push({ key: k, title: categoryTitleById[k] ?? k, items: byKey[k] });
      }
      for (const k of Object.keys(byKey)) {
        if (used.has(k)) continue;
        out.push({ key: k, title: categoryTitleById[k] ?? k, items: byKey[k] });
      }
      return out;
    }

    // number / unknown → no headings
    return [{ key: "all", title: "", items: rows }];
  }, [rows, sort, manifest, categoryTitleById, levelTitleById]);

  function Row({ s, id, isSelected, href }: (typeof rows)[number]) {
    const n = skillNumberById?.[String(id)] ?? null;
    return (
      <div
        key={id}
        role="button"
        tabIndex={0}
        onClick={() => router.push(href, { scroll: false })}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") router.push(href, { scroll: false });
        }}
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 text-sm hover:bg-muted/50 cursor-pointer",
          isSelected ? "border-primary bg-muted/50" : "",
        )}
        aria-current={isSelected ? "page" : undefined}
      >
        <div className="w-8 rounded-md bg-neutral-500 px-1 py-0.5 text-center text-xs font-medium tabular-nums text-white">
          {typeof n === "number" ? n : "–"}
        </div>

        <div className="min-w-[200px] flex-1">
          <div className="font-medium">{(s as any).name ?? id}</div>
          <div className="text-xs text-muted-foreground">
            {(s as any).quadrant}
            {(s as any).ring ? ` · ${(s as any).ring}` : ""}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.key} className="space-y-2">
          {g.title ? (
            <div className="pt-4 pb-2 text-sm font-semibold text-foreground">{g.title}</div>
          ) : null}
          <div className="space-y-2">
            {g.items.map((r) => (
              <Row key={r.id} {...r} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
