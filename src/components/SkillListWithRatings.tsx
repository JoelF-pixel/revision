"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";


import { cn } from "@/lib/utils";

type Skill = {
  id: string;
  name?: string;
  quadrant?: string;
  ring?: string;
  categoryId?: string;
  levelId?: string;
  kitTags?: string[];
  prereqs?: string[];
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
  searchQuery,
}: {
  packId: string;
  skills: Skill[];
  selectedSkillId?: string | null;
  categoryId?: string | null;
  sort?: string | null;
  manifest?: Manifest;
  skillNumberById?: Record<string, number>;
  searchQuery?: string;
}) {
  const router = useRouter();
  const [expandedHubs, setExpandedHubs] = useState<Record<string, boolean>>({});
  const q = (searchQuery || "").trim().toLowerCase();

  const allRows = useMemo(() => {
    const paramsBase = new URLSearchParams();
    paramsBase.set("view", "list");
    if (categoryId) paramsBase.set("categoryId", String(categoryId));
    if (sort) paramsBase.set("sort", String(sort));
    if (searchQuery) paramsBase.set("q", String(searchQuery));

    return skills.map((s) => {
      const id = String(s.id);
      const isSelected = !!selectedSkillId && String(selectedSkillId) === id;
      const params = new URLSearchParams(paramsBase);
      params.set("skillId", id);
      const href = `/p/${packId}/skills?${params.toString()}`;
      return { s, id, isSelected, href };
    });
  }, [skills, selectedSkillId, packId, categoryId, sort, searchQuery]);

  const rows = useMemo(() => {
    // "Hubs-only" list: show only sub-section hub dots, then expand to reveal children.
    const isHub = (s: any) => {
      const id = String(s?.id ?? "");
      const tags: string[] = Array.isArray(s?.kitTags) ? s.kitTags.map(String) : [];
      return tags.includes("subsection") || id.startsWith("maths-subsection-") || /^aqa-chem-4-\d+-\d+$/.test(id);
    };

    return allRows.filter((r) => isHub(r.s));
  }, [allRows]);

  const childrenByHubId = useMemo(() => {
    const map = new Map<string, string[]>();
    // preserve pack order: iterate the full `skills` list and append child ids to the relevant hub
    for (const s of skills) {
      const id = String((s as any).id);
      const prereqs: string[] = Array.isArray((s as any).prereqs) ? (s as any).prereqs.map(String) : [];
      for (const hubId of prereqs) {
        if (!map.has(hubId)) map.set(hubId, []);
        map.get(hubId)!.push(id);
      }
    }
    return map;
  }, [skills]);

  const filteredRows = useMemo(() => {
    if (!q) return rows;

    const byId = new Map(allRows.map((r) => [r.id, r] as const));
    const matches = (r: any) => {
      const text = [r.id, r.s?.name, r.s?.quadrant, r.s?.ring, r.s?.categoryId, r.s?.levelId, ...(r.s?.kitTags || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    };

    const matched = new Set(rows.filter(matches).map((r) => r.id));

    // Include hubs when any of their linked children match the search.
    for (const [hubId, childIds] of childrenByHubId.entries()) {
      const childMatch = childIds.some((id) => {
        const c = byId.get(id);
        return c ? matches(c) : false;
      });
      if (childMatch) matched.add(hubId);
    }

    return rows.filter((r) => matched.has(r.id));
  }, [rows, q, allRows, childrenByHubId]);

  const isHubSkill = (s: any) => {
    const id = String(s?.id ?? "");
    const tags: string[] = Array.isArray(s?.kitTags) ? s.kitTags.map(String) : [];
    return tags.includes("subsection") || id.startsWith("maths-subsection-") || /^aqa-chem-4-\d+-\d+$/.test(id);
  };

  const categoryTitleById = useMemo(() => {
    return Object.fromEntries((manifest?.categories ?? []).map((c) => [String(c.id), String(c.title ?? c.id)]));
  }, [manifest]);

  const levelTitleById = useMemo(() => {
    return Object.fromEntries((manifest?.levels ?? []).map((l) => [String(l.id), String(l.title ?? l.id)]));
  }, [manifest]);

  const groups = useMemo(() => {
    const mode = sort || "category";

    const expandItems = (items: typeof rows) => {
      const byId = new Map(allRows.map((r) => [r.id, r] as const));
      const out: Array<(typeof rows)[number] & { isChild?: boolean; parentId?: string }> = [];

      for (const r of items) {
        out.push(r);
        if (!isHubSkill(r.s)) continue;
        const hubId = r.id;
        if (!expandedHubs[hubId]) continue;
        const childIds = childrenByHubId.get(hubId) ?? [];
        for (const childId of childIds) {
          const child = byId.get(childId);
          if (!child) continue;
          out.push({ ...child, isChild: true, parentId: hubId });
        }
      }

      return out;
    };

    if (mode === "level") {
      const out: { key: string; title: string; items: typeof rows }[] = [];
      const byKey: Record<string, typeof rows> = {};

      for (const r of filteredRows) {
        const key = String((r.s as any).levelId ?? "").trim() || "unknown";
        byKey[key] ||= [];
        byKey[key].push(r);
      }

      const orderedKeys = (manifest?.levels ?? []).map((l) => String(l.id));
      const used = new Set<string>();
      for (const k of orderedKeys) {
        if (!byKey[k]?.length) continue;
        used.add(k);
        out.push({ key: k, title: levelTitleById[k] ?? k, items: expandItems(byKey[k]) as any });
      }
      for (const k of Object.keys(byKey)) {
        if (used.has(k)) continue;
        out.push({ key: k, title: levelTitleById[k] ?? k, items: expandItems(byKey[k]) as any });
      }
      return out;
    }

    if (mode === "category" || mode === "quadrants") {
      const out: { key: string; title: string; items: typeof rows }[] = [];
      const byKey: Record<string, typeof rows> = {};

      for (const r of filteredRows) {
        const key = String((r.s as any).categoryId ?? "").trim() || "uncategorised";
        byKey[key] ||= [];
        byKey[key].push(r);
      }

      const orderedKeys = (manifest?.categories ?? []).map((c) => String(c.id));
      const used = new Set<string>();
      for (const k of orderedKeys) {
        if (!byKey[k]?.length) continue;
        used.add(k);
        out.push({ key: k, title: categoryTitleById[k] ?? k, items: expandItems(byKey[k]) as any });
      }
      for (const k of Object.keys(byKey)) {
        if (used.has(k)) continue;
        out.push({ key: k, title: categoryTitleById[k] ?? k, items: expandItems(byKey[k]) as any });
      }
      return out;
    }

    // number / unknown → no headings
    return [{ key: "all", title: "", items: expandItems(filteredRows) as any }];
  }, [filteredRows, sort, manifest, categoryTitleById, levelTitleById, expandedHubs, childrenByHubId, allRows]);

  function Row({ s, id, isSelected, href, isChild, parentId }: any) {
    const n = skillNumberById?.[String(id)] ?? null;
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          // Row click navigates (expansion is handled by the +/- chip so it doesn't jump your scroll).
          router.push(href, { scroll: false });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            router.push(href, { scroll: false });
          }
        }}
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 text-sm hover:bg-muted/50 cursor-pointer",
          isSelected ? "border-primary bg-muted/50" : "",
          isChild ? "ml-6 border-dashed" : "",
        )}
        aria-current={isSelected ? "page" : undefined}
      >
        <div
          className={cn(
            "w-8 rounded-md px-1 py-0.5 text-center text-xs font-medium tabular-nums text-white",
            // Sub-section hubs: highlight the number chip in aurora violet.
            (Array.isArray((s as any).kitTags) && (s as any).kitTags.includes("subsection")) ||
              String(id).startsWith("maths-subsection-") ||
              /^aqa-chem-4-\d+-\d+$/.test(String(id))
              ? "bg-[rgba(142,92,246,0.54)]"
              : "bg-neutral-500",
          )}
          onClick={(e) => {
            if (!isHubSkill(s)) return;
            e.preventDefault();
            e.stopPropagation();
            setExpandedHubs((prev) => ({ ...prev, [id]: !prev[id] }));
          }}
          role={isHubSkill(s) ? "button" : undefined}
          aria-label={isHubSkill(s) ? (expandedHubs[id] ? "Collapse" : "Expand") : undefined}
          title={isHubSkill(s) ? (expandedHubs[id] ? "Collapse" : "Expand") : undefined}
        >
          {isHubSkill(s) ? (expandedHubs[id] ? "−" : "+") : typeof n === "number" ? n : "–"}
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
      {groups.every((g) => !g.items.length) ? (
        <div className="text-sm text-muted-foreground">No skills match your search.</div>
      ) : null}
      {groups.map((g) => (
        <div key={g.key} className="space-y-2">
          {g.title ? (
            <div className="pt-4 pb-2 text-sm font-semibold text-foreground">{g.title}</div>
          ) : null}
          <div className="space-y-2">
            {g.items.map((r: any) => (
              <Row key={r.isChild ? `${r.parentId}::${r.id}` : r.id} {...r} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
