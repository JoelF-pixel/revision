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
};

type Short = {
  id: string;
  stem: string;
  marks: number;
  markScheme: string[];
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
      },
      {
        id: "sa-2",
        stem: "Define osmosis.",
        marks: 2,
        markScheme: [
          "Movement of water",
          "Through a partially permeable membrane from dilute to more concentrated",
        ],
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
      },
    ],
    [],
  );

  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});
  const [selfMarks, setSelfMarks] = useState<Record<string, number>>({});

  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const mcqScore = useMemo(() => {
    let ok = 0;
    for (const q of mcqs) {
      if (mcqAnswers[q.id] && mcqAnswers[q.id] === q.answerId) ok += 1;
    }
    return { ok, total: mcqs.length };
  }, [mcqs, mcqAnswers]);

  const shortScore = useMemo(() => {
    const total = shorts.reduce((a, s) => a + s.marks, 0);
    const ok = shorts.reduce(
      (a, s) => a + Math.max(0, Math.min(s.marks, selfMarks[s.id] ?? 0)),
      0,
    );
    return { ok, total };
  }, [shorts, selfMarks]);

  const overall = useMemo(() => {
    const total = mcqScore.total + shortScore.total;
    const ok = mcqScore.ok + shortScore.ok;
    const pct = total ? ok / total : 0;
    return { ok, total, pct, rating: ratingFromPercent(pct) };
  }, [mcqScore, shortScore]);

  async function saveDerivedRatings() {
    setSaving(true);
    setError(null);
    setSaveOk(false);

    try {
      // 1) Set unit progress to IN_PROGRESS (baseline started).
      const p1 = await fetch("/api/unit-progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packId, unitId, status: "IN_PROGRESS" }),
      });
      if (!p1.ok) throw new Error("unit-progress");

      // 2) Apply derived rating to all skills taught by the unit.
      for (const skillId of teaches) {
        const res = await fetch("/api/ratings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ packId, skillId, rating: overall.rating }),
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
        <CardTitle>Transport in cells — baseline</CardTitle>
        <CardDescription>
          5 MCQs + 3 short answers. After marking, save to set your starting skill ratings.
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

        <div className="rounded-lg border p-4 space-y-2">
          <div className="font-medium">Score</div>
          <div className="text-sm text-muted-foreground">
            MCQ: {mcqScore.ok}/{mcqScore.total} · Short answer: {shortScore.ok}/{shortScore.total} · Overall: {overall.ok}/{overall.total} ({Math.round(overall.pct * 100)}%)
          </div>
          <div className="text-sm">
            Derived skill rating: <span className="font-semibold">{overall.rating}</span> (applied to the skills this lesson teaches)
          </div>
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
