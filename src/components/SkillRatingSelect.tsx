"use client";

import { useEffect, useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function clampRating(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(3, Math.trunc(n)));
}

export function SkillRatingSelect({
  packId,
  skillId,
  className,
}: {
  packId: string;
  skillId: string;
  className?: string;
}) {
  const [isAuthed, setIsAuthed] = useState(true);
  const [value, setValue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const res = await fetch(`/api/ratings?packId=${encodeURIComponent(packId)}`, { cache: "no-store" });
      if (!res.ok) {
        if (!cancelled) {
          setIsAuthed(false);
          setLoading(false);
        }
        return;
      }

      const json = await res.json();
      const found = (json.ratings ?? []).find((r: any) => String(r.skillId) === String(skillId));
      const next = found ? clampRating(found.rating) : 0;
      if (!cancelled) {
        setIsAuthed(true);
        setValue(next);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [packId, skillId]);

  async function save(next: number) {
    if (!isAuthed) return;

    setSaving(true);
    setValue(next);

    const res = await fetch("/api/ratings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ packId, skillId, rating: next }),
    });

    if (!res.ok) setIsAuthed(false);
    setSaving(false);
  }

  if (!isAuthed) return null;

  return (
    <Select
      value={String(value)}
      onValueChange={(v) => save(clampRating(v))}
      disabled={loading || saving}
    >
      <SelectTrigger className={className ?? "w-[190px]"}>
        <SelectValue placeholder="Set level" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="0">0 — Not started</SelectItem>
        <SelectItem value="1">1 — Working</SelectItem>
        <SelectItem value="2">2 — Practitioner</SelectItem>
        <SelectItem value="3">3 — Expert</SelectItem>
      </SelectContent>
    </Select>
  );
}
