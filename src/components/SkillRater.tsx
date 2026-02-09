"use client";

import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SkillRater({ skillId, packId }: { skillId: string; packId: string }) {
  const [value, setValue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/ratings?packId=${encodeURIComponent(packId)}`, { cache: "no-store" });
      if (!res.ok) {
        setLoading(false);
        setError("Sign in to rate this skill.");
        return;
      }
      const json = await res.json();
      const found = (json.ratings ?? []).find((r: any) => String(r.skillId) === skillId);
      const v = found ? Number(found.rating) : 0;
      if (!cancelled) {
        setValue(Number.isFinite(v) ? v : 0);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [skillId]);

  async function save(next: number) {
    setSaving(true);
    setError(null);
    setValue(next);

    const res = await fetch("/api/ratings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ packId, skillId, rating: next }),
    });

    if (!res.ok) setError("Failed to save (are you signed in?).");
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your rating</CardTitle>
        <CardDescription>0–3 for this skill</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {error ? null : (
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(value)}
              onValueChange={(v) => save(Number(v))}
              disabled={loading || saving}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Set level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0 — Not started</SelectItem>
                <SelectItem value="1">1 — Working</SelectItem>
                <SelectItem value="2">2 — Practitioner</SelectItem>
                <SelectItem value="3">3 — Expert</SelectItem>
              </SelectContent>
            </Select>

            {loading ? <span className="text-xs text-muted-foreground">Loading…</span> : null}
            {saving ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
          </div>
        )}

        {error ? (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">{error}</div>
            <GoogleSignInButton className="h-9 shrink-0" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
