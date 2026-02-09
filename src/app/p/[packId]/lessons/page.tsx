import { notFound } from "next/navigation";

import contentIndex from "../../../../../content/generated/content-index.json";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { UnitsClient } from "./UnitsClient";

export default async function PackLessonsIndexPage(props: {
  params: Promise<{ packId: string }>;
}) {
  const { packId } = await props.params;

  const pack = (contentIndex as any).packs?.[packId];
  if (!pack) return notFound();

  const units = Object.values(pack.unitsById ?? {}) as any[];
  const { makeUnitComparator } = await import("@/lib/content/sortUnits");
  units.sort(makeUnitComparator(pack.manifest));

  return (
    <main className="mx-auto max-w-6xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-3xl font-semibold tracking-tight">Lessons</h1>
            </CardTitle>
          <CardDescription>
            Hands-on lessons for this pack. Filter by progress and keep moving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {units.length === 0 ? (
            <div className="text-sm text-muted-foreground">No lessons yet.</div>
          ) : (
            <UnitsClient packId={packId} units={units} skillsById={pack.skillsById} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
