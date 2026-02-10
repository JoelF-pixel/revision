"use client";

import { useMemo, useState } from "react";

import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Mcq = {
  id: string;
  stem: string;
  choices: { id: string; text: string }[];
  answerId: string;
  explain?: string;
  skillId: string;
  points?: number; // default 1
};

type Short = {
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

export function TransportInCellsBaselineQuiz({
  packId,
  unitId,
  teaches,
}: {
  packId: string;
  unitId: string;
  teaches: string[];
}) {
  const mcqs: Mcq[] = useMemo(
    () => [
      {
        id: "mcq-1",
        stem: "Which process describes the movement of water through a partially permeable membrane?",
        choices: [
          { id: "A", text: "Diffusion" },
          { id: "B", text: "Osmosis" },
          { id: "C", text: "Active transport" },
          { id: "D", text: "Respiration" },
        ],
        answerId: "B",
        explain: "Osmosis is the diffusion of water through a partially permeable membrane.",
        skillId: "diffusion-osmosis-active-transport",
      },
      {
        id: "mcq-2",
        stem: "Which process requires energy?",
        choices: [
          { id: "A", text: "Diffusion" },
          { id: "B", text: "Osmosis" },
          { id: "C", text: "Active transport" },
          { id: "D", text: "Evaporation" },
        ],
        answerId: "C",
        explain: "Active transport uses energy from respiration to move substances against a gradient.",
        skillId: "diffusion-osmosis-active-transport",
      },
      {
        id: "mcq-3",
        stem: "In diffusion, particles move overall from…",
        choices: [
          { id: "A", text: "low → high concentration" },
          { id: "B", text: "high → low concentration" },
          { id: "C", text: "inside → outside only" },
          { id: "D", text: "outside → inside only" },
        ],
        answerId: "B",
        skillId: "diffusion-osmosis-active-transport",
      },
      {
        id: "mcq-4",
        stem: "A plant cell is placed in a very concentrated sugar solution. What happens?",
        choices: [
          { id: "A", text: "It becomes turgid" },
          { id: "B", text: "It becomes plasmolysed" },
          { id: "C", text: "It bursts" },
          { id: "D", text: "Nothing changes" },
        ],
        answerId: "B",
        skillId: "osmosis-in-plant-and-animal-cells",
      },
      {
        id: "mcq-5",
        stem: "Why do villi help absorption in the small intestine?",
        choices: [
          { id: "A", text: "They reduce surface area" },
          { id: "B", text: "They increase surface area" },
          { id: "C", text: "They stop osmosis" },
          { id: "D", text: "They prevent diffusion" },
        ],
        answerId: "B",
        skillId: "surface-area-and-diffusion",
      },
      {
        id: "mcq-6",
        stem: "In the potato osmosis practical, what is usually the independent variable?",
        choices: [
          { id: "A", text: "Mass of the potato cylinder" },
          { id: "B", text: "Concentration of the sugar/salt solution" },
          { id: "C", text: "Temperature of the room" },
          { id: "D", text: "Time of day" },
        ],
        answerId: "B",
        skillId: "required-practical-osmosis",
        explain: "You change the solution concentration and measure change in mass (or % change).",
      },
      {
        id: "mcq-7",
        stem: "Why should you blot the potato cylinders dry before weighing?",
        choices: [
          { id: "A", text: "To increase diffusion" },
          { id: "B", text: "To remove excess solution that would affect the mass" },
          { id: "C", text: "To cool the potato" },
          { id: "D", text: "To stop active transport" },
        ],
        answerId: "B",
        skillId: "required-practical-osmosis",
      },
    ],
    [],
  );

  const shorts: Short[] = useMemo(
    () => [
      {
        id: "sa-1",
        stem: "Define diffusion.",
        marks: 2,
        markScheme: [
          "Net movement of particles",
          "From a region of higher concentration to lower concentration",
        ],
        skillId: "diffusion-osmosis-active-transport",
      },
      {
        id: "sa-2",
        stem: "Define osmosis.",
        marks: 2,
        markScheme: [
          "Movement of water",
          "Through a partially permeable membrane from dilute to more concentrated",
        ],
        skillId: "diffusion-osmosis-active-transport",
      },
      {
        id: "sa-3",
        stem: "Explain why active transport is needed to absorb glucose in the small intestine.",
        marks: 3,
        markScheme: [
          "Sometimes glucose concentration is lower in the gut than in the blood/cells",
          "So glucose must move against the concentration gradient",
          "This requires energy (from respiration)",
        ],
        skillId: "diffusion-osmosis-active-transport",
      },
      {
        id: "sa-4",
        stem: "In the potato osmosis practical, state one control variable and how you would control it.",
        marks: 2,
        markScheme: [
          "Any valid control variable (e.g. time in solution / size of cylinders / temperature)",
          "How it is kept the same (e.g. same time for all, same length/diameter, use water bath)",
        ],
        skillId: "required-practical-osmosis",
      },
      {
        id: "sa-5",
        stem: "Describe how you would calculate percentage change in mass.",
        marks: 2,
        markScheme: [
          "(final mass - initial mass) / initial mass × 100",
          "Can be negative if mass decreases",
        ],
        skillId: "required-practical-osmosis",
      },
    ],
    [],
  );

  const assessedSkillIds = useMemo(() => {
    // Only include skills that:
    // 1) the unit teaches
    // 2) have at least one question mapped
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

    // MCQs (1 point each by default)
    for (const q of mcqs) {
      const pts = typeof q.points === "number" ? q.points : 1;
      const ok = mcqAnswers[q.id] && mcqAnswers[q.id] === q.answerId ? pts : 0;
      add(q.skillId, ok, pts);
    }

    // Short answers (self-marked)
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

  async function saveDerivedRatings() {
    setSaving(true);
    setError(null);
    setSaveOk(false);

    try {
      // Mark unit as started.
      const p1 = await fetch("/api/unit-progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packId, unitId, status: "IN_PROGRESS" }),
      });
      if (!p1.ok) throw new Error("unit-progress");

      // Save per-skill ratings (only for skills we actually assessed).
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

  const unassessedTaughtSkills = useMemo(() => {
    const taught = new Set(teaches.map(String));
    const assessed = new Set(assessedSkillIds);
    return Array.from(taught).filter((sid) => !assessed.has(sid));
  }, [teaches, assessedSkillIds]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transport in cells — baseline</CardTitle>
        <CardDescription>
          5 MCQs + 3 short answers. After self-marking, we save **separate ratings per skill**.
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
                          className={
                            mcqAnswers[q.id] === q.answerId ? "text-green-700" : "text-red-700"
                          }
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
                      <td className="py-1 pr-3">{s.ok}/{s.total}</td>
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
