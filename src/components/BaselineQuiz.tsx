"use client";

import { useMemo, useState } from "react";

import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export type BaselineMcq = {
  id: string;
  stem: string;
  choices: { id: string; text: string }[];
  answerId: string;
  explain?: string;
  skillId: string;
  points?: number; // default 1
};

export type BaselineShort = {
  id: string;
  stem: string;
  marks: number;
  markScheme: string[];
  skillId: string;
};

type SkillScore = {
  ok: number;
  total: number;
  pct: number;
  rating: 0 | 1 | 2 | 3;
};

function ratingFromPercent(pct: number): 0 | 1 | 2 | 3 {
  if (pct >= 0.85) return 3;
  if (pct >= 0.65) return 2;
  if (pct >= 0.4) return 1;
  return 0;
}

export function BaselineQuiz({
  packId,
  unitId,
  teaches,
  title,
  mcqs,
  shorts,
}: {
  packId: string;
  unitId: string;
  teaches: string[];
  title: string;
  mcqs: BaselineMcq[];
  shorts: BaselineShort[];
}) {
  const assessedSkillIds = useMemo(() => {
    const taught = new Set(teaches.map(String));
    const mapped = new Set<string>();
    for (const q of mcqs) mapped.add(q.skillId);
    for (const q of shorts) mapped.add(q.skillId);
    return Array.from(mapped).filter((sid) => taught.has(sid));
  }, [teaches, mcqs, shorts]);

  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});
  const [selfMarks, setSelfMarks] = useState<Record<string, number>>({});

  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const scoreBySkill: Record<string, SkillScore> = useMemo(() => {
    const totals: Record<string, { ok: number; total: number }> = {};

    function add(skillId: string, ok: number, total: number) {
      if (!totals[skillId]) totals[skillId] = { ok: 0, total: 0 };
      totals[skillId].ok += ok;
      totals[skillId].total += total;
    }

    // MCQs
    for (const q of mcqs) {
      const pts = typeof q.points === "number" ? q.points : 1;
      const ok = mcqAnswers[q.id] && mcqAnswers[q.id] === q.answerId ? pts : 0;
      add(q.skillId, ok, pts);
    }

    // Short answers
    for (const q of shorts) {
      const ok = Math.max(0, Math.min(q.marks, selfMarks[q.id] ?? 0));
      add(q.skillId, ok, q.marks);
    }

    const out: Record<string, SkillScore> = {};
    for (const [sid, v] of Object.entries(totals)) {
      const pct = v.total ? v.ok / v.total : 0;
      out[sid] = { ok: v.ok, total: v.total, pct, rating: ratingFromPercent(pct) };
    }

    return out;
  }, [mcqs, shorts, mcqAnswers, selfMarks]);

  const overall = useMemo(() => {
    const all = Object.values(scoreBySkill);
    const total = all.reduce((a, s) => a + s.total, 0);
    const ok = all.reduce((a, s) => a + s.ok, 0);
    const pct = total ? ok / total : 0;
    return { ok, total, pct, rating: ratingFromPercent(pct) };
  }, [scoreBySkill]);

  const unassessedTaughtSkills = useMemo(() => {
    const taught = new Set(teaches.map(String));
    const assessed = new Set(assessedSkillIds);
    return Array.from(taught).filter((sid) => !assessed.has(sid));
  }, [teaches, assessedSkillIds]);

  async function saveDerivedRatings() {
    setSaving(true);
    setError(null);
    setSaveOk(false);

    try {
      const p1 = await fetch("/api/unit-progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packId, unitId, status: "IN_PROGRESS" }),
      });
      if (!p1.ok) throw new Error("unit-progress");

      for (const skillId of assessedSkillIds) {
        const s = scoreBySkill[skillId];
        const rating = (s?.rating ?? overall.rating) as 0 | 1 | 2 | 3;

        const res = await fetch("/api/ratings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ packId, skillId, rating }),
        });

        if (!res.ok) throw new Error("ratings");
      }

      setSaveOk(true);
    } catch {
      setError("Couldn’t save. Make sure you’re signed in, then try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title} — baseline</CardTitle>
        <CardDescription>
          {mcqs.length} MCQs + {shorts.length} short answers. After self-marking, we save separate ratings per skill.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">MCQ</h2>
          <div className="space-y-4">
            {mcqs.map((q, idx) => (
              <div key={q.id} className="rounded-lg border p-4 space-y-2">
                <div className="font-medium">
                  {idx + 1}. {q.stem}
                </div>
                <div className="grid gap-2">
                  {q.choices.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={q.id}
                        value={c.id}
                        checked={mcqAnswers[q.id] === c.id}
                        onChange={() => setMcqAnswers((m) => ({ ...m, [q.id]: c.id }))}
                        disabled={submitted}
                      />
                      <span>
                        <span className="font-mono mr-2">{c.id}</span>
                        {c.text}
                      </span>
                    </label>
                  ))}
                </div>
                {submitted ? (
                  <div className="text-sm">
                    <div>
                      Correct answer: <span className="font-semibold">{q.answerId}</span>
                      {mcqAnswers[q.id] ? (
                        <span
                          className={mcqAnswers[q.id] === q.answerId ? "text-green-700" : "text-red-700"}
                        >
                          {mcqAnswers[q.id] === q.answerId ? "  ✓" : "  ✗"}
                        </span>
                      ) : null}
                    </div>
                    {q.explain ? <div className="text-muted-foreground">{q.explain}</div> : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <Separator />

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Short answer</h2>
          <div className="space-y-4">
            {shorts.map((q, idx) => (
              <div key={q.id} className="rounded-lg border p-4 space-y-2">
                <div className="font-medium">
                  {idx + 1}. {q.stem} <span className="text-muted-foreground">({q.marks} marks)</span>
                </div>

                <textarea
                  className="min-h-24 w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Type your answer…"
                  value={shortAnswers[q.id] ?? ""}
                  onChange={(e) => setShortAnswers((m) => ({ ...m, [q.id]: e.target.value }))}
                  disabled={submitted}
                />

                {submitted ? (
                  <div className="space-y-2 text-sm">
                    <div className="text-muted-foreground">
                      Mark scheme:
                      <ul className="list-disc pl-5 mt-1">
                        {q.markScheme.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm">Self-mark:</div>
                      <input
                        type="number"
                        min={0}
                        max={q.marks}
                        className="h-9 w-20 rounded-md border px-2 text-sm"
                        value={String(selfMarks[q.id] ?? 0)}
                        onChange={(e) => setSelfMarks((m) => ({ ...m, [q.id]: Number(e.target.value) }))}
                      />
                      <div className="text-muted-foreground text-sm">/ {q.marks}</div>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <div className="rounded-lg border p-4 space-y-3">
          <div className="font-medium">Score</div>
          <div className="text-sm text-muted-foreground">
            Overall: {overall.ok}/{overall.total} ({Math.round(overall.pct * 100)}%)
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-3">Skill</th>
                  <th className="py-1 pr-3">Score</th>
                  <th className="py-1 pr-3">%</th>
                  <th className="py-1">Rating</th>
                </tr>
              </thead>
              <tbody>
                {assessedSkillIds.map((sid) => {
                  const s = scoreBySkill[sid];
                  if (!s) return null;
                  return (
                    <tr key={sid} className="border-t">
                      <td className="py-1 pr-3 font-mono text-xs">{sid}</td>
                      <td className="py-1 pr-3">
                        {s.ok}/{s.total}
                      </td>
                      <td className="py-1 pr-3">{Math.round(s.pct * 100)}%</td>
                      <td className="py-1 font-semibold">{s.rating}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {unassessedTaughtSkills.length ? (
            <div className="text-xs text-muted-foreground">
              Note: these taught skills weren’t assessed by this baseline, so we won’t change their ratings yet:
              <div className="mt-1 font-mono">{unassessedTaughtSkills.join(", ")}</div>
            </div>
          ) : null}
        </div>

        {!submitted ? (
          <Button
            type="button"
            className="rounded-full"
            onClick={() => {
              setSubmitted(true);
              setSaveOk(false);
              setError(null);
            }}
          >
            Reveal mark scheme
          </Button>
        ) : (
          <div className="space-y-2">
            {error ? <div className="text-sm text-destructive">{error}</div> : null}
            {saveOk ? (
              <div className="text-sm text-green-700">Saved. Your plan will update based on these ratings.</div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="button" className="rounded-full" onClick={saveDerivedRatings} disabled={saving}>
                {saving ? "Saving…" : "Save baseline"}
              </Button>
              <GoogleSignInButton className="h-10 px-4" />
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  setSubmitted(false);
                  setMcqAnswers({});
                  setShortAnswers({});
                  setSelfMarks({});
                  setError(null);
                  setSaveOk(false);
                }}
                disabled={saving}
              >
                Reset
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
