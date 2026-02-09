import Link from "next/link";
import { notFound } from "next/navigation";

import contentIndex from "../../../../../content/generated/content-index.json";

import { SkillMatrix } from "@/components/SkillMatrix";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PackAssessmentPage(props: {
  params: Promise<{ packId: string }>;
}) {
  const { packId } = await props.params;

  const pack = (contentIndex as any).packs?.[packId];
  if (!pack) return notFound();

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-2xl">Self-assessment</h1>
          </CardTitle>
          <CardDescription>
            Rate yourself per skill: 0 = not started, 1 = working, 2 = practitioner, 3 = expert.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">How to use this</div>
          <ul className="list-disc pl-5 space-y-1">
            <li>Be honest: you’re setting a baseline, not writing a CV.</li>
            <li>You can browse skills without signing in.</li>
            <li>To save ratings and get a personalised plan, sign in with Google.</li>
          </ul>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/p/${packId}/plan`}>View my plan</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rate skills</CardTitle>
          <CardDescription>
            This is the full set of skills for this pack. Use the view options to browse and update your ratings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SkillMatrix packId={packId} manifest={pack.manifest} skills={pack.skills} />
        </CardContent>
      </Card>
    </main>
  );
}
