"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Skill = {
  id: string;
  name: string;
  quadrant: string;
  ring: string;
  categoryId?: string;
  levelId?: string;
  order?: number;
  prereqs?: string[];
  kitTags?: string[];
};

type Manifest = {
  categories: { id: string; title: string }[];
  levels: { id: string; title: string }[];
};

type RatingMap = Record<string, number>; // skillId -> rating (0-3)

function clampRating(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(3, Math.trunc(n)));
}

export function SkillMatrix({
  skills,
  packId,
  manifest,
  categoryIdFilter,
}: {
  skills: Skill[];
  packId: string;
  manifest: Manifest;
  categoryIdFilter?: string;
}) {
  const [ratings, setRatings] = useState<RatingMap>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(true);

  const [scope, setScope] = useState<"plan" | "all">("all");
  const [viewMode, setViewMode] = useState<"quadrants" | "levels" | "number">("quadrants");
  const [onlyRemaining, setOnlyRemaining] = useState(false);
  const [ragFilter, setRagFilter] = useState<"all" | "unrated" | "red" | "amber" | "green">("all");
  const [bulkSaving, setBulkSaving] = useState<number | null>(null);
  const [bulkClearing, setBulkClearing] = useState(false);

  // Default target: reach Working (1) everywhere
  const target = 1;

  const categoryOrder = useMemo(() => (manifest.categories || []).map((c) => c.id), [manifest]);
  const levelOrder = useMemo(() => (manifest.levels || []).map((l) => l.id), [manifest]);

  const categoryTitleById = useMemo(
    () => Object.fromEntries((manifest.categories || []).map((c) => [c.id, c.title])),
    [manifest],
  );
  const levelTitleById = useMemo(
    () => Object.fromEntries((manifest.levels || []).map((l) => [l.id, l.title])),
    [manifest],
  );

  const workingLevelId = levelOrder[0] ?? "working";

  const rankLevel = useMemo(() => new Map(levelOrder.map((id, i) => [id, i])), [levelOrder]);
  const rankCategory = useMemo(() => new Map(categoryOrder.map((id, i) => [id, i])), [categoryOrder]);


  const childrenByHubId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const sk of skills) {
      const childId = String(sk.id);
      const prereqs = Array.isArray(sk.prereqs) ? sk.prereqs.map(String) : [];
      for (const hubId of prereqs) {
        if (!map.has(hubId)) map.set(hubId, []);
        map.get(hubId)!.push(childId);
      }
    }
    return map;
  }, [skills]);

  function isPurpleHub(skillId: string): boolean {
    const id = String(skillId);
    if (id.startsWith("maths-subsection-")) return true;
    if (/^aqa-(phys|chem)-4-\d+-\d+$/.test(id)) return true;
    return false;
  }

  function isBulkHub(skillId: string): boolean {
    return isPurpleHub(skillId);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setIsAuthed(true);
      const res = await fetch(`/api/ratings?packId=${encodeURIComponent(packId)}`, { cache: "no-store" });
      if (!res.ok) {
        setLoading(false);
        setIsAuthed(false);
        // Logged out: force the matrix into browse mode.
        setScope("all");
        setOnlyRemaining(false);
        return;
      }
      const json = await res.json();
      const map: RatingMap = {};
      for (const r of json.ratings ?? []) map[String(r.skillId)] = clampRating(r.rating);
      if (!cancelled) {
        setRatings(map);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [packId]);

  async function save(skillId: string, nextRating: number) {
    if (!isAuthed) return;

    setSavingId(skillId);
    setError(null);

    const targets = isBulkHub(skillId)
      ? [skillId, ...(childrenByHubId.get(String(skillId)) || [])]
      : [skillId];

    // optimistic
    setRatings((r) => {
      const next = { ...r };
      for (const id of targets) next[String(id)] = nextRating;
      return next;
    });

    let failed = false;
    for (const id of targets) {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packId, skillId: id, rating: nextRating }),
      });
      if (!res.ok) failed = true;
    }

    if (failed) setError("Failed to save some ratings (are you signed in?).");
    setSavingId(null);
  }

  async function clearRating(skillId: string) {
    if (!isAuthed) return;

    setSavingId(skillId);
    setError(null);

    const targets = isBulkHub(skillId)
      ? [skillId, ...(childrenByHubId.get(String(skillId)) || [])]
      : [skillId];

    // optimistic: remove keys so they render as unrated/grey
    setRatings((r) => {
      const next = { ...r };
      for (const id of targets) delete next[String(id)];
      return next;
    });

    let failed = false;
    for (const id of targets) {
      const res = await fetch("/api/ratings", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packId, skillId: id }),
      });
      if (!res.ok) failed = true;
    }

    if (failed) setError("Failed to clear some ratings (are you signed in?).");
    setSavingId(null);
  }


  function ragOf(skillId: string): "unrated" | "red" | "amber" | "green" {
    const has = Object.prototype.hasOwnProperty.call(ratings, skillId);
    if (!has) return "unrated";
    const v = ratings[skillId] ?? 0;
    if (v <= 0) return "red";
    if (v === 1) return "amber";
    return "green";
  }

  async function applyBulkVisible(rating: number, visibleSkillIds: string[]) {
    if (!isAuthed || !visibleSkillIds.length) return;
    setBulkSaving(rating);
    setError(null);

    setRatings((prev) => {
      const next = { ...prev };
      for (const id of visibleSkillIds) next[id] = rating;
      return next;
    });

    for (const skillId of visibleSkillIds) {
      await fetch("/api/ratings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packId, skillId, rating }),
      });
    }

    setBulkSaving(null);
  }



  async function applyBulkUnrated(visibleSkillIds: string[]) {
    if (!isAuthed || !visibleSkillIds.length) return;
    setBulkClearing(true);
    setError(null);

    setRatings((prev) => {
      const next = { ...prev };
      for (const id of visibleSkillIds) delete next[id];
      return next;
    });

    for (const skillId of visibleSkillIds) {
      await fetch("/api/ratings", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packId, skillId }),
      });
    }

    setBulkClearing(false);
  }

  const scopedSkills = useMemo(() => {
    const filtered = categoryIdFilter
      ? skills.filter((s) => String(s.categoryId ?? "") === String(categoryIdFilter))
      : skills;

    const base = scope === "plan"
      ? filtered.filter((s) => (String(s.levelId || "").trim() || workingLevelId) === workingLevelId)
      : filtered.slice();

    let next = base;

    if (scope === "plan" && onlyRemaining) {
      next = next.filter((s) => (ratings[s.id] ?? 0) < target);
    }

    if (ragFilter !== "all") {
      next = next.filter((s) => ragOf(String(s.id)) === ragFilter);
    }

    return next;
  }, [skills, categoryIdFilter, scope, onlyRemaining, ratings, target, workingLevelId, ragFilter]);

  const visibleSkillIds = useMemo(() => scopedSkills.map((s) => String(s.id)), [scopedSkills]);

  const flatByNumber = useMemo(() => {
    const list = scopedSkills.slice();
    list.sort((a, b) => {
      const la = rankLevel.get(String(a.levelId || workingLevelId)) ?? 999;
      const lb = rankLevel.get(String(b.levelId || workingLevelId)) ?? 999;
      const ca = rankCategory.get(String(a.categoryId || "")) ?? 999;
      const cb = rankCategory.get(String(b.categoryId || "")) ?? 999;
      const oa = a.order ?? 0;
      const ob = b.order ?? 0;

      // Plan scope: number view should still follow quadrant/ring ordering before order.
      // All scope: keep it predictable: level, category, order, name.
      if (la !== lb) return la - lb;
      if (ca !== cb) return ca - cb;
      if (oa !== ob) return oa - ob;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [scopedSkills, rankLevel, rankCategory, workingLevelId]);

  const byCategoryThenLevel = useMemo(() => {
    // category -> level -> skills[]
    const by: Record<string, Record<string, Skill[]>> = {};
    for (const s of scopedSkills) {
      const cat = String(s.categoryId || "").trim() || "uncategorised";
      const lvl = String(s.levelId || "").trim() || workingLevelId;
      by[cat] ||= {};
      by[cat][lvl] ||= [];
      by[cat][lvl].push(s);
    }

    for (const cat of Object.keys(by)) {
      for (const lvl of Object.keys(by[cat])) {
        by[cat][lvl].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
      }
    }

    return by;
  }, [scopedSkills, workingLevelId]);

  const byLevelThenCategory = useMemo(() => {
    // level -> category -> skills[]
    const by: Record<string, Record<string, Skill[]>> = {};
    for (const s of scopedSkills) {
      const lvl = String(s.levelId || "").trim() || workingLevelId;
      const cat = String(s.categoryId || "").trim() || "uncategorised";
      by[lvl] ||= {};
      by[lvl][cat] ||= [];
      by[lvl][cat].push(s);
    }

    for (const lvl of Object.keys(by)) {
      for (const cat of Object.keys(by[lvl])) {
        by[lvl][cat].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
      }
    }

    return by;
  }, [scopedSkills, workingLevelId]);

  const canShowLevelsView = scope === "all";

  // If user flips to plan scope, force a sensible view.
  useEffect(() => {
    if (scope === "plan" && viewMode === "levels") setViewMode("quadrants");
  }, [scope, viewMode]);

  return (
    <div className="space-y-6">
      {error ? <div className="text-sm text-destructive">{error}</div> : null}
      {loading ? <div className="text-sm text-muted-foreground">Loading ratings…</div> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {isAuthed ? (
            <Select value={scope} onValueChange={(v) => setScope(v as any)}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plan">Plan skills</SelectItem>
                <SelectItem value="all">All skills</SelectItem>
              </SelectContent>
            </Select>
          ) : null}

          <Select value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quadrants">Sort by: category</SelectItem>
              {canShowLevelsView ? <SelectItem value="levels">Sort by: level</SelectItem> : null}
              <SelectItem value="number">Sort by: number</SelectItem>
            </SelectContent>
          </Select>

          {isAuthed && scope === "plan" ? (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={onlyRemaining}
                onChange={(e) => setOnlyRemaining(e.target.checked)}
              />
              Only remaining
            </label>
          ) : null}
        </div>

        <div className="text-sm text-muted-foreground">{scopedSkills.length} skills</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Filter:</span>
        {([
          ["all", "All"],
          ["unrated", "Unrated"],
          ["red", "Red"],
          ["amber", "Amber"],
          ["green", "Green"],
        ] as const).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={ragFilter === key ? "secondary" : "outline"}
            className="h-7 rounded-full px-3 text-xs"
            onClick={() => setRagFilter(key)}
          >
            {label}
          </Button>
        ))}

        {isAuthed ? (
          <>
            
            <span className="mx-1 text-xs text-muted-foreground">| Set visible:</span>
            <Button type="button" size="sm" variant="outline" className="h-7 rounded-full px-3 text-xs" disabled={bulkSaving !== null || bulkClearing} onClick={() => applyBulkUnrated(visibleSkillIds)}>{bulkClearing?"Clearing…":"Grey"}</Button>
            <Button type="button" size="sm" variant="outline" className="h-7 rounded-full px-3 text-xs" disabled={bulkSaving !== null || bulkClearing} onClick={() => applyBulkVisible(0, visibleSkillIds)}>{bulkSaving===0?"Saving…":"Red"}</Button>
            <Button type="button" size="sm" variant="outline" className="h-7 rounded-full px-3 text-xs" disabled={bulkSaving !== null || bulkClearing} onClick={() => applyBulkVisible(1, visibleSkillIds)}>{bulkSaving===1?"Saving…":"Amber"}</Button>
            <Button type="button" size="sm" variant="outline" className="h-7 rounded-full px-3 text-xs" disabled={bulkSaving !== null || bulkClearing} onClick={() => applyBulkVisible(2, visibleSkillIds)}>{bulkSaving===2?"Saving…":"Green"}</Button>
          </>
        ) : null}
      </div>

      {viewMode === "number" ? (
        <div className="space-y-2">
          {flatByNumber.map((s) => {
            const hasRating = Object.prototype.hasOwnProperty.call(ratings, s.id);
            const value = hasRating ? (ratings[s.id] ?? 0) : -1;
            const isHubRow = isPurpleHub(String(s.id));
            const catLabel = categoryTitleById[s.categoryId ?? ""] ?? s.quadrant;
            const lvlLabel = levelTitleById[s.levelId ?? ""] ?? s.ring;

            return (
              <div key={s.id} className={"flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 " + (isHubRow ? "border-violet-300 border-l-4 border-l-violet-400 bg-violet-100/55 dark:bg-violet-500/16 ring-1 ring-violet-300/45 dark:ring-violet-300/30" : "")}>
                <div className="min-w-[240px]">
                  <Link className="font-medium text-primary hover:underline" href={`/p/${packId}/skills/${s.id}`}>
                    {s.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {catLabel}
                    {scope === "all" ? ` · ${lvlLabel}` : ""}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isAuthed ? (
                    <>
                      <Select
                        value={String(value)}
                        onValueChange={(v) => { if (v === "-1") { clearRating(s.id); return; } save(s.id, clampRating(v)); }}
                        disabled={savingId === s.id || !!error || loading}
                      >
                        <SelectTrigger className="w-[190px]">
                          <SelectValue placeholder="Set level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-1">— Unrated</SelectItem>
                          <SelectItem value="0">0 — Red</SelectItem>
                          <SelectItem value="1">1 — Amber</SelectItem>
                          <SelectItem value="2">2 — Green</SelectItem>
                          <SelectItem value="3">3 — Green+</SelectItem>
                        </SelectContent>
                      </Select>
                      {savingId === s.id ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === "levels" ? (
        <div className="space-y-6">
          {levelOrder.map((lvlId, li) => {
            const levelTitle = levelTitleById[lvlId] ?? lvlId;
            const byCat = byLevelThenCategory[lvlId] ?? {};

            // Skip empty levels
            const hasAny = Object.values(byCat).some((arr) => arr.length);
            if (!hasAny) return null;

            return (
              <div key={lvlId} className="space-y-4">
                {li > 0 ? <Separator /> : null}
                <div className="text-sm font-medium text-muted-foreground">{levelTitle}</div>

                {categoryOrder.map((catId) => {
                  const list = byCat[catId] ?? [];
                  if (!list.length) return null;

                  const categoryTitle = categoryTitleById[catId] ?? catId;
                  return (
                    <div key={`${lvlId}:${catId}`} className="space-y-3">
                      <h3 className="text-base font-medium">{categoryTitle}</h3>
                      <div className="space-y-2">
                        {list.map((s) => {
                          const hasRating = Object.prototype.hasOwnProperty.call(ratings, s.id);
                          const value = hasRating ? (ratings[s.id] ?? 0) : -1;
                          const isHubRow = isPurpleHub(String(s.id));
                          return (
                            <div key={s.id} className={"flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 " + (isHubRow ? "border-violet-300 border-l-4 border-l-violet-400 bg-violet-100/55 dark:bg-violet-500/16 ring-1 ring-violet-300/45 dark:ring-violet-300/30" : "")}>
                              <div className="min-w-[240px]">
                                <Link className="font-medium text-primary hover:underline" href={`/p/${packId}/skills/${s.id}`}>
                                  {s.name}
                                </Link>
                              </div>
                              <div className="flex items-center gap-2">
                                {isAuthed ? (
                                  <>
                                    <Select
                                      value={String(value)}
                                      onValueChange={(v) => { if (v === "-1") { clearRating(s.id); return; } save(s.id, clampRating(v)); }}
                                      disabled={savingId === s.id}
                                    >
                                      <SelectTrigger className="w-[190px]">
                                        <SelectValue placeholder="Set level" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="0">0 — Red</SelectItem>
                                        <SelectItem value="1">1 — Amber</SelectItem>
                                        <SelectItem value="2">2 — Green</SelectItem>
                                        <SelectItem value="3">3 — Green+</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    {savingId === s.id ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
                                  </>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6">
          {categoryOrder.map((catId, i) => {
            const byLevel = byCategoryThenLevel[catId] ?? {};
            const listAny = Object.values(byLevel).flat();
            if (!listAny.length) return null;

            const categoryTitle = categoryTitleById[catId] ?? catId;

            return (
              <div key={catId} className="space-y-3">
                {i > 0 ? <Separator /> : null}
                <h3 className="text-base font-medium">{categoryTitle}</h3>

                {(scope === "all" ? levelOrder : [workingLevelId]).map((lvlId) => {
                  const list = byLevel[lvlId] ?? [];
                  if (!list.length) return null;

                  const levelTitle = levelTitleById[lvlId] ?? lvlId;

                  return (
                    <div key={`${catId}:${lvlId}`} className="space-y-2">
                      {scope === "all" ? (
                        <div className="text-xs font-medium text-muted-foreground">{levelTitle}</div>
                      ) : null}

                      {list.map((s) => {
                        const hasRating = Object.prototype.hasOwnProperty.call(ratings, s.id);
                        const value = hasRating ? (ratings[s.id] ?? 0) : -1;
                        const isHubRow = isPurpleHub(String(s.id));
                        const needsWork = scope === "plan" && value < target;

                        return (
                          <div
                            key={s.id}
                            className={
                              "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 " +
                              (needsWork ? "bg-muted/50 " : "") +
                              (isHubRow ? "border-violet-300 border-l-4 border-l-violet-400 bg-violet-100/55 dark:bg-violet-500/16 ring-1 ring-violet-300/45 dark:ring-violet-300/30" : "")
                            }
                          >
                            <div className="min-w-[240px]">
                              <Link className="font-medium text-primary hover:underline" href={`/p/${packId}/skills/${s.id}`}>
                                {s.name}
                              </Link>
                              
                            </div>

                            <div className="flex items-center gap-2">
                              {isAuthed ? (
                                <>
                                  <Select
                                    value={String(value)}
                                    onValueChange={(v) => { if (v === "-1") { clearRating(s.id); return; } save(s.id, clampRating(v)); }}
                                    disabled={savingId === s.id}
                                  >
                                    <SelectTrigger className="w-[190px]">
                                      <SelectValue placeholder="Set level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="0">0 — Red</SelectItem>
                                      <SelectItem value="1">1 — Amber</SelectItem>
                                      <SelectItem value="2">2 — Green</SelectItem>
                                      <SelectItem value="3">3 — Green+</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {savingId === s.id ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
                                </>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Any categories not in manifest order */}
          {Object.keys(byCategoryThenLevel)
            .filter((id) => !categoryOrder.includes(id))
            .map((catId) => {
              const byLevel = byCategoryThenLevel[catId] ?? {};
              const listAny = Object.values(byLevel).flat();
              if (!listAny.length) return null;

              const categoryTitle = categoryTitleById[catId] ?? catId;

              return (
                <div key={catId} className="space-y-3">
                  <Separator />
                  <h3 className="text-base font-medium">{categoryTitle}</h3>

                  {(scope === "all" ? levelOrder : [workingLevelId]).map((lvlId) => {
                    const list = byLevel[lvlId] ?? [];
                    if (!list.length) return null;

                    const levelTitle = levelTitleById[lvlId] ?? lvlId;

                    return (
                      <div key={`${catId}:${lvlId}`} className="space-y-2">
                        {scope === "all" ? (
                          <div className="text-xs font-medium text-muted-foreground">{levelTitle}</div>
                        ) : null}
                        {list.map((s) => {
                          const hasRating = Object.prototype.hasOwnProperty.call(ratings, s.id);
                          const value = hasRating ? (ratings[s.id] ?? 0) : -1;
                          const isHubRow = isPurpleHub(String(s.id));
                          return (
                            <div key={s.id} className={"flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 " + (isHubRow ? "border-violet-300 border-l-4 border-l-violet-400 bg-violet-100/55 dark:bg-violet-500/16 ring-1 ring-violet-300/45 dark:ring-violet-300/30" : "")}>
                              <div className="min-w-[240px]">
                                <Link className="font-medium text-primary hover:underline" href={`/p/${packId}/skills/${s.id}`}>
                                  {s.name}
                                </Link>
                              </div>
                              {isAuthed ? (
                                <Select
                                  value={String(value)}
                                  onValueChange={(v) => { if (v === "-1") { clearRating(s.id); return; } save(s.id, clampRating(v)); }}
                                  disabled={savingId === s.id}
                                >
                                  <SelectTrigger className="w-[190px]">
                                    <SelectValue placeholder="Set level" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">0 — Red</SelectItem>
                                    <SelectItem value="1">1 — Amber</SelectItem>
                                    <SelectItem value="2">2 — Green</SelectItem>
                                    <SelectItem value="3">3 — Green+</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
