"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleSignInLink } from "@/components/GoogleSignInLink";

type Skill = {
  id: string;
  name: string;
  categoryId?: string;
  levelId?: string;
  quadrant: string;
  ring: string;
  order?: number;
};

type Manifest = {
  categories: { id: string; title: string }[];
  levels: { id: string; title: string }[];
};

type RatingMap = Record<string, number>;

function clampRating(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(3, Math.trunc(n)));
}

export function SkillPlanCard({
  packId,
  skills,
  manifest,
}: {
  packId: string;
  skills: Skill[];
  manifest: Manifest;
}) {
  const [ratings, setRatings] = useState<RatingMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const target = 1; // reach Working everywhere

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/ratings?packId=${encodeURIComponent(packId)}`, { cache: "no-store" });
      if (!res.ok) {
        setLoading(false);
        setError("Sign in to load/save ratings.");
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

  const categoryTitleById = useMemo(() => {
    return Object.fromEntries((manifest.categories || []).map((c) => [c.id, c.title]));
  }, [manifest]);

  const workingSkillsInOrder = useMemo(() => {
    const workingLevelId = manifest.levels?.[0]?.id ?? "working";

    const byCat: Record<string, Skill[]> = {};
    for (const s of skills) {
      const levelId = String(s.levelId || "").trim() || "working";
      if (levelId !== workingLevelId) continue;
      const categoryId = String(s.categoryId || "").trim() || "uncategorised";
      byCat[categoryId] ||= [];
      byCat[categoryId].push(s);
    }

    for (const cat of Object.keys(byCat)) {
      byCat[cat].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }

    const out: Skill[] = [];
    for (const catId of manifest.categories?.map((c) => c.id) ?? []) {
      out.push(...(byCat[catId] ?? []));
    }

    // Any categories not in manifest order go at the end
    for (const catId of Object.keys(byCat)) {
      if (manifest.categories?.some((c) => c.id === catId)) continue;
      out.push(...byCat[catId]);
    }

    return out;
  }, [skills, manifest]);

  const workingTotal = workingSkillsInOrder.length;
  const workingMet = workingSkillsInOrder.filter((s) => (ratings[s.id] ?? 0) >= target).length;
  const nextUp = workingSkillsInOrder.filter((s) => (ratings[s.id] ?? 0) < target).slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Progress</CardTitle>
        <CardDescription>
          Target: reach <span className="font-medium">Working</span> everywhere (rating ≥ {target}).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">{error}</div>
            <GoogleSignInLink
              href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent(`/p/${packId}/plan`)}`}
              className="h-9"
            />
          </div>
        ) : null}
        {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm text-muted-foreground">Progress</div>
          <Badge variant="secondary">
            {workingMet} / {workingTotal}
          </Badge>
        </div>

        <div>
          <div className="text-sm font-medium">Next up (first 10 not yet at Working)</div>
          {nextUp.length ? (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
              {nextUp.map((s) => (
                <li key={s.id}>
                  <Link className="text-primary hover:underline" href={`/p/${packId}/skills/${s.id}`}>
                    {s.name}
                  </Link>
                  <span className="text-muted-foreground">
                    {" "}— {categoryTitleById[s.categoryId ?? ""] ?? s.quadrant}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">All Working skills hit. Move target to Practitioner next.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
