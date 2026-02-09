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

  const [scope, setScope] = useState<"plan" | "all">("plan");
  const [viewMode, setViewMode] = useState<"quadrants" | "levels" | "number">("quadrants");
  const [onlyRemaining, setOnlyRemaining] = useState(false);

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

    // optimistic
    setRatings((r) => ({ ...r, [skillId]: nextRating }));

    const res = await fetch("/api/ratings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ packId, skillId, rating: nextRating }),
    });

    if (!res.ok) setError("Failed to save rating (are you signed in?).");
    setSavingId(null);
  }

  const scopedSkills = useMemo(() => {
    const filtered = categoryIdFilter
      ? skills.filter((s) => String(s.categoryId ?? "") === String(categoryIdFilter))
      : skills;

    const base = scope === "plan"
      ? filtered.filter((s) => (String(s.levelId || "").trim() || workingLevelId) === workingLevelId)
      : filtered.slice();

    if (scope === "plan" && onlyRemaining) {
      return base.filter((s) => (ratings[s.id] ?? 0) < target);
    }

    return base;
  }, [skills, categoryIdFilter, scope, onlyRemaining, ratings, target, workingLevelId]);

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

      {viewMode === "number" ? (
        <div className="space-y-2">
          {flatByNumber.map((s) => {
            const value = ratings[s.id] ?? 0;
            const catLabel = categoryTitleById[s.categoryId ?? ""] ?? s.quadrant;
            const lvlLabel = levelTitleById[s.levelId ?? ""] ?? s.ring;

            return (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
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
                        onValueChange={(v) => save(s.id, clampRating(v))}
                        disabled={savingId === s.id || !!error || loading}
                      >
                        <SelectTrigger className="w-[190px]">
                          <SelectValue placeholder="Set level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0 — Not started</SelectItem>
                          <SelectItem value="1">1 — Working</SelectItem>
                          <SelectItem value="2">2 — Practitioner</SelectItem>
                          <SelectItem value="3">3 — Expert</SelectItem>
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
                          const value = ratings[s.id] ?? 0;
                          return (
                            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
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
                                      onValueChange={(v) => save(s.id, clampRating(v))}
                                      disabled={savingId === s.id}
                                    >
                                      <SelectTrigger className="w-[190px]">
                                        <SelectValue placeholder="Set level" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="0">0 — Not started</SelectItem>
                                        <SelectItem value="1">1 — Working</SelectItem>
                                        <SelectItem value="2">2 — Practitioner</SelectItem>
                                        <SelectItem value="3">3 — Expert</SelectItem>
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
                        const value = ratings[s.id] ?? 0;
                        const needsWork = scope === "plan" && value < target;

                        return (
                          <div
                            key={s.id}
                            className={
                              "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 " +
                              (needsWork ? "bg-muted/50" : "")
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
                                    onValueChange={(v) => save(s.id, clampRating(v))}
                                    disabled={savingId === s.id}
                                  >
                                    <SelectTrigger className="w-[190px]">
                                      <SelectValue placeholder="Set level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="0">0 — Not started</SelectItem>
                                      <SelectItem value="1">1 — Working</SelectItem>
                                      <SelectItem value="2">2 — Practitioner</SelectItem>
                                      <SelectItem value="3">3 — Expert</SelectItem>
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
                          const value = ratings[s.id] ?? 0;
                          return (
                            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                              <div className="min-w-[240px]">
                                <Link className="font-medium text-primary hover:underline" href={`/p/${packId}/skills/${s.id}`}>
                                  {s.name}
                                </Link>
                              </div>
                              {isAuthed ? (
                                <Select
                                  value={String(value)}
                                  onValueChange={(v) => save(s.id, clampRating(v))}
                                  disabled={savingId === s.id}
                                >
                                  <SelectTrigger className="w-[190px]">
                                    <SelectValue placeholder="Set level" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">0 — Not started</SelectItem>
                                    <SelectItem value="1">1 — Working</SelectItem>
                                    <SelectItem value="2">2 — Practitioner</SelectItem>
                                    <SelectItem value="3">3 — Expert</SelectItem>
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
