"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Category = { id: string; title?: string };
type Skill = { id: string; name: string; categoryId?: string };

type Level = 0 | 1 | 2 | 3;

const LEVEL_LABEL: Record<Level, string> = {
  0: "0 — Not started",
  1: "1 — Working",
  2: "2 — Practitioner",
  3: "3 — Expert",
};

export function AssessmentWizard({
  packId,
  categories,
  skills,
  onDone,
}: {
  packId: string;
  categories: Category[];
  skills: Skill[];
  onDone?: () => void;
}) {
  const steps = useMemo(
    () => categories.map((c) => ({ id: String(c.id), title: c.title ?? c.id })),
    [categories],
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [byCategory, setByCategory] = useState<Record<string, Level>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = steps[stepIndex] ?? null;

  const skillsInStep = useMemo(() => {
    if (!step) return [];
    return skills.filter((s) => String(s.categoryId ?? "") === String(step.id));
  }, [skills, step]);

  const value: Level = (byCategory[step?.id ?? ""] ?? 1) as Level;

  async function saveAll() {
    setSaving(true);
    setError(null);

    try {
      // Apply selected category rating to all skills in that category.
      // (Simple model: one rating per category as a first-pass assessment.)
      for (const cat of steps) {
        const rating = (byCategory[cat.id] ?? 1) as Level;
        const catSkills = skills.filter((s) => String(s.categoryId ?? "") === String(cat.id));

        for (const s of catSkills) {
          const res = await fetch("/api/ratings", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ packId, skillId: s.id, rating }),
          });
          if (!res.ok) throw new Error("Failed to save ratings");
        }
      }

      onDone?.();
    } catch {
      setError("Failed to save your assessment. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!step) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assessment wizard</CardTitle>
          <CardDescription>No categories found for this pack.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assessment wizard</CardTitle>
        <CardDescription>
          Step {stepIndex + 1} of {steps.length}: {step.title}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Pick a level for this category. We’ll apply it to all skills in the category as a starting point.
        </div>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(LEVEL_LABEL) as unknown as Level[]).map((lvl) => (
            <Button
              key={lvl}
              type="button"
              variant={value === lvl ? "secondary" : "outline"}
              className="rounded-full"
              onClick={() => setByCategory((m) => ({ ...m, [step.id]: lvl }))}
            >
              {LEVEL_LABEL[lvl]}
            </Button>
          ))}
        </div>

        <div className="rounded-lg border p-3">
          <div className="text-sm font-medium">Skills in this category</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {skillsInStep.slice(0, 12).map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
            {skillsInStep.length > 12 ? <li>…and {skillsInStep.length - 12} more</li> : null}
          </ul>
        </div>

        {error ? <div className="text-sm text-destructive">{error}</div> : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0 || saving}
          >
            Back
          </Button>

          {stepIndex < steps.length - 1 ? (
            <Button
              type="button"
              className="rounded-full"
              onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
              disabled={saving}
            >
              Next
            </Button>
          ) : (
            <Button type="button" className="rounded-full" onClick={saveAll} disabled={saving}>
              {saving ? "Saving…" : "Finish and save"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
