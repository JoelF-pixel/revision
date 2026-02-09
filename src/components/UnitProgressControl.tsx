"use client";

import { useEffect, useState } from "react";

import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Status = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE";

export function UnitProgressControl({
  packId,
  unitId,
}: {
  packId: string;
  unitId: string;
}) {
  const [value, setValue] = useState<Status>("NOT_STARTED");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/unit-progress?packId=${encodeURIComponent(packId)}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        setLoading(false);
        setError("Sign in to track progress.");
        return;
      }

      const json = await res.json();
      const found = (json.progress ?? []).find((p: any) => String(p.unitId) === unitId);
      const next = (found?.status as Status) || "NOT_STARTED";

      if (!cancelled) {
        setValue(next);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [packId, unitId]);

  async function save(next: Status) {
    setSaving(true);
    setError(null);
    setValue(next);

    const res = await fetch("/api/unit-progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ packId, unitId, status: next }),
    });

    if (!res.ok) setError("Failed to save (are you signed in?).");
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Progress</CardTitle>
        <CardDescription>Track this lesson.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {error ? null : (
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={value}
              onValueChange={(v) => save(v as Status)}
              disabled={loading || saving}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Set status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NOT_STARTED">Not started</SelectItem>
                <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                <SelectItem value="COMPLETE">Complete</SelectItem>
              </SelectContent>
            </Select>

            {loading ? <span className="text-xs text-muted-foreground">Loading…</span> : null}
            {saving ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
          </div>
        )}

        {error ? (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">{error}</div>
            <GoogleSignInButton className="h-8 px-3 text-xs" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
