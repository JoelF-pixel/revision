import Link from "next/link";
import { notFound } from "next/navigation";

import contentIndex from "../../../../../../../content/generated/content-index.json";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { TransportInCellsBaselineQuiz } from "./transport-in-cells";

export default async function BaselineQuizPage(props: { params: Promise<{ packId: string; id: string }> }) {
  const { packId, id } = await props.params;

  const pack = (contentIndex as any).packs?.[packId];
  if (!pack) return notFound();

  const unit = pack.unitsById?.[id];
  if (!unit) return notFound();

  // MVP: only a single baseline quiz is implemented.
  if (!(packId === "aqa-biology-higher" && id === "unit.transport-in-cells")) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Baseline quiz</CardTitle>
            <CardDescription>
              No baseline quiz exists for this lesson yet.
            </CardDescription>
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

  // Skills taught by the unit (used for saving derived ratings).
  const teaches = Array.isArray(unit.teaches) ? unit.teaches.map(String) : [];

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

      <TransportInCellsBaselineQuiz packId={packId} unitId={id} teaches={teaches} />
    </main>
  );
}
