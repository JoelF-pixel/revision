"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GoogleSignInLink } from "@/components/GoogleSignInLink";

type Status = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE";

type Unit = {
  id: string;
  title?: string;
  summary?: string;
  teaches?: string[];
};

type Skill = {
  id: string;
  name: string;
};

type RatingRow = { skillId: string; rating: number };

type ProgressRow = { unitId: string; status: Status };

function statusRank(s: Status): number {
  // prioritize in-progress, then not-started, then complete
  if (s === "IN_PROGRESS") return 0;
  if (s === "NOT_STARTED") return 1;
  return 2;
}

export function NextUnitCard({
  packId,
  units,
  skillsById,
  title = "Next best lesson",
  embedded = false,
}: {
  packId: string;
  units: Unit[];
  skillsById: Record<string, Skill>;
  title?: string;
  embedded?: boolean;
}) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const [ratingsRes, progressRes] = await Promise.all([
        fetch(`/api/ratings?packId=${encodeURIComponent(packId)}`, { cache: "no-store" }),
        fetch(`/api/unit-progress?packId=${encodeURIComponent(packId)}`, { cache: "no-store" }),
      ]);

      if (!ratingsRes.ok || !progressRes.ok) {
        setLoading(false);
        setError("Sign in to get personalised next steps.");
        return;
      }

      const ratingsJson = (await ratingsRes.json()) as { ratings?: RatingRow[] };
      const progressJson = (await progressRes.json()) as { progress?: ProgressRow[] };

      const r: Record<string, number> = {};
      for (const row of ratingsJson.ratings ?? []) r[String(row.skillId)] = Number(row.rating) || 0;

      const p: Record<string, Status> = {};
      for (const row of progressJson.progress ?? []) p[String(row.unitId)] = row.status;

      if (!cancelled) {
        setRatings(r);
        setProgress(p);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [packId]);

  const recommendation = useMemo(() => {
    const candidates = units
      .map((u) => ({
        u,
        status: (progress[u.id] ?? "NOT_STARTED") as Status,
      }))
      .filter((x) => x.status !== "COMPLETE");

    if (candidates.length === 0) return null;

    // Score a unit by how low-rated the taught skills are.
    // Lower score => more useful.
    function unitScore(unit: Unit): number {
      const teaches = (unit.teaches ?? []).map(String);
      if (teaches.length === 0) return 999;
      const vals = teaches.map((sid) => {
        const v = ratings[sid];
        return typeof v === "number" ? v : 0;
      });
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return avg;
    }

    candidates.sort((a, b) => {
      const sr = statusRank(a.status) - statusRank(b.status);
      if (sr !== 0) return sr;

      const sa = unitScore(a.u);
      const sb = unitScore(b.u);
      if (sa !== sb) return sa - sb;

      return String(a.u.title ?? a.u.id).localeCompare(String(b.u.title ?? b.u.id));
    });

    const top = candidates[0];
    return {
      unit: top.u,
      status: top.status,
      score: unitScore(top.u),
    };
  }, [units, progress, ratings]);

  const Inner = (
    <>
      {recommendation ? (
        <div className="rounded-lg border p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link
                className="font-medium text-primary hover:underline"
                href={`/p/${packId}/lessons/${recommendation.unit.id}`}
              >
                {recommendation.unit.title ?? recommendation.unit.id}
              </Link>
              {recommendation.unit.summary ? (
                <div className="mt-1 text-sm text-muted-foreground">{recommendation.unit.summary}</div>
              ) : null}
            </div>
            <Badge variant={recommendation.status === "COMPLETE" ? "secondary" : "outline"}>
              {recommendation.status === "IN_PROGRESS"
                ? "In progress"
                : recommendation.status === "NOT_STARTED"
                  ? "Not started"
                  : "Complete"}
            </Badge>
          </div>

          {Array.isArray(recommendation.unit.teaches) && recommendation.unit.teaches.length ? (
            <div className="mt-3 text-sm">
              <div className="text-xs text-muted-foreground">Teaches</div>
              <ul className="mt-1 list-disc pl-5">
                {recommendation.unit.teaches.slice(0, 6).map((sid) => (
                  <li key={sid}>
                    <Link className="text-primary hover:underline" href={`/p/${packId}/skills/${sid}`}>
                      {skillsById[sid]?.name ?? sid}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          No recommendation yet (either no lessons, or you’ve completed them all).
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/p/${packId}/lessons`}>Browse all lessons</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/p/${packId}/assessment`}>Revise assessment</Link>
        </Button>
      </div>
    </>
  );

  if (embedded) {
    return <div className="space-y-3">{Inner}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {loading
            ? "Loading your ratings + progress…"
            : error
              ? error
              : "Based on your ratings and what you’ve already completed."}
          {error ? (
            <div className="mt-2">
              <GoogleSignInLink
                href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent(`/p/${packId}`)}`}
                className="h-8 px-3 text-xs"
              />
            </div>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">{Inner}</CardContent>
    </Card>
  );
}
