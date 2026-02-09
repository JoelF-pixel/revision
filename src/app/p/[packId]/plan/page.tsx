import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import contentIndex from "../../../../../content/generated/content-index.json";

import { SkillPlanCard } from "@/components/SkillPlanCard";
import { NextUnitCard } from "@/components/NextUnitCard";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PackPlanPage(props: {
  params: Promise<{ packId: string }>;
}) {
  const { packId } = await props.params;

  const pack = (contentIndex as any).packs?.[packId];
  if (!pack) return notFound();

  // Behind login: plan depends on stored ratings/progress.
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect(`/api/auth/signin/google?callbackUrl=${encodeURIComponent(`/p/${packId}/plan`)}`);
  }

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-3xl font-semibold tracking-tight">My plan</h1>
          </CardTitle>
          <CardDescription>
            Your next steps, based on your skill ratings and what you’ve already completed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href={`/p/${packId}/lessons`}>Browse lessons</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/p/${packId}/skills`}>Update skill ratings</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <SkillPlanCard packId={packId} skills={pack.skills} manifest={pack.manifest} />

        <NextUnitCard
          packId={packId}
          units={Object.values(pack.unitsById ?? {})}
          skillsById={pack.skillsById}
          title="Next step"
        />
      </div>
    </main>
  );
}
