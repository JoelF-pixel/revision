"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { makeUnitComparator } from "@/lib/content/sortUnits";

type Status = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE";

export type Unit = {
  id: string;
  title?: string;
  summary?: string;
  teaches?: string[];
  estimatedMinutes?: number;
  difficulty?: string;
  categoryId?: string;
  levelId?: string;
  order?: number;
  doneWhen?: string[];
};

export type Skill = {
  id: string;
  name: string;
};

type ProgressRow = { unitId: string; status: Status };

type Filter = "all" | "incomplete" | "in_progress" | "complete";

function statusLabel(s: Status): string {
  if (s === "COMPLETE") return "Complete";
  if (s === "IN_PROGRESS") return "In progress";
  return "Not started";
}

function statusVariant(s: Status): "secondary" | "outline" {
  if (s === "COMPLETE") return "secondary";
  return "outline";
}

export function UnitsClient({
  packId,
  units,
  skillsById,
}: {
  packId: string;
  units: Unit[];
  skillsById: Record<string, Skill>;
}) {
  const [progress, setProgress] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(true);
  const [filter, setFilter] = useState<Filter>("incomplete");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setIsAuthed(true);
      const res = await fetch(`/api/unit-progress?packId=${encodeURIComponent(packId)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setLoading(false);
        setIsAuthed(false);
        setFilter("all");
        return;
      }
      const json = await res.json();
      const map: Record<string, Status> = {};
      for (const row of (json.progress ?? []) as ProgressRow[]) {
        map[String(row.unitId)] = row.status;
      }
      if (!cancelled) {
        setProgress(map);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [packId]);

  const enriched = useMemo(() => {
    const unitComparator = makeUnitComparator();

    return units
      .map((u) => {
        const status: Status = progress[u.id] ?? "NOT_STARTED";
        return { ...u, status };
      })
      .filter((u) => {
        if (filter === "all") return true;
        if (filter === "complete") return u.status === "COMPLETE";
        if (filter === "in_progress") return u.status === "IN_PROGRESS";
        if (filter === "incomplete") return u.status !== "COMPLETE";
        return true;
      })
      .sort((a, b) => {
        // incomplete first
        const rank = (s: Status) => (s === "COMPLETE" ? 2 : s === "IN_PROGRESS" ? 0 : 1);
        const r = rank(a.status) - rank(b.status);
        if (r !== 0) return r;
        return unitComparator(a, b);
      });
  }, [units, progress, filter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {isAuthed ? (
            <>
              <Button
                size="sm"
                variant={filter === "incomplete" ? "default" : "outline"}
                onClick={() => setFilter("incomplete")}
              >
                Incomplete
              </Button>
              <Button
                size="sm"
                variant={filter === "in_progress" ? "default" : "outline"}
                onClick={() => setFilter("in_progress")}
              >
                In progress
              </Button>
              <Button
                size="sm"
                variant={filter === "complete" ? "default" : "outline"}
                onClick={() => setFilter("complete")}
              >
                Complete
              </Button>
              <Button
                size="sm"
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
              >
                All
              </Button>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <GoogleSignInButton className="h-9 shrink-0" />
              <span className="text-xs text-muted-foreground">Sign in to filter by progress.</span>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          {loading ? "Loading progress…" : `${enriched.length} shown`}
        </div>
      </div>

      <ul className="space-y-3">
        {enriched.map((u) => {
          return (
            <li key={u.id} className="rounded-lg border p-3">
              <div className="min-w-[240px]">
                <Link className="font-medium text-primary hover:underline" href={`/p/${packId}/lessons/${u.id}`}>
                  {u.title ?? u.id}
                </Link>
                {u.summary ? <div className="mt-1 text-sm text-muted-foreground">{u.summary}</div> : null}

                <div className="mt-2 flex flex-wrap items-center justify-start gap-2">
                  {isAuthed ? <Badge variant={statusVariant(u.status)}>{statusLabel(u.status)}</Badge> : null}
                  {typeof u.estimatedMinutes === "number" ? (
                    <Badge variant="outline">{u.estimatedMinutes} min</Badge>
                  ) : null}
                  {u.difficulty ? <Badge variant="outline">{u.difficulty}</Badge> : null}
                  <Badge variant="secondary">{(u.teaches?.length ?? 0)} skills</Badge>
                </div>
              </div>

              {Array.isArray(u.teaches) && u.teaches.length ? (
                <div className="mt-3 text-sm">
                  <div className="text-xs text-muted-foreground">Teaches</div>
                  <ul className="mt-1 list-disc pl-5">
                    {u.teaches.map((sid: string) => {
                      const s = skillsById?.[sid];
                      return (
                        <li key={sid}>
                          <Link className="text-primary hover:underline" href={`/p/${packId}/skills/${sid}`}>
                            {s?.name ?? sid}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
