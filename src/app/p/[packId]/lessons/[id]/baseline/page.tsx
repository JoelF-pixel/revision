import fs from "node:fs";
import path from "node:path";
import Link from "next/link";

import matter from "gray-matter";
import { notFound } from "next/navigation";

import contentIndex from "../../../../../../../content/generated/content-index.json";

import { BaselineQuiz, type BaselineMcq, type BaselineShort } from "@/components/BaselineQuiz";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BaselineQuizPage(props: {
  params: Promise<{ packId: string; id: string }>;
}) {
  const { packId, id } = await props.params;

  const pack = (contentIndex as any).packs?.[packId];
  if (!pack) return notFound();

  const unit = pack.unitsById?.[id];
  if (!unit?.sourcePath) return notFound();

  const filePath = path.join(process.cwd(), unit.sourcePath);
  if (!fs.existsSync(filePath)) return notFound();

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = matter(raw);
  const d: any = parsed.data || {};

  const teaches: string[] = Array.isArray(d.teaches) ? d.teaches.map(String) : [];

  const baseline = (d.baseline ?? null) as any;
  const mcqs: BaselineMcq[] = Array.isArray(baseline?.mcq) ? baseline.mcq : [];
  const shorts: BaselineShort[] = Array.isArray(baseline?.short) ? baseline.short : [];

  if (mcqs.length === 0 && shorts.length === 0) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Baseline quiz</CardTitle>
            <CardDescription>No baseline quiz exists for this lesson yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href={`/p/${packId}/lessons/${id}`}>Back to lesson</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-2xl">Baseline quiz</h1>
          </CardTitle>
          <CardDescription>
            {unit.title} — answer a few questions to set a starting point. You can retry any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/p/${packId}/lessons/${id}`}>Back to lesson</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/p/${packId}/assessment`}>Skill ratings</Link>
          </Button>
        </CardContent>
      </Card>

      <BaselineQuiz packId={packId} unitId={id} teaches={teaches} title={String(d.title ?? unit.title ?? id)} mcqs={mcqs} shorts={shorts} />
    </main>
  );
}
