import Link from "next/link";
import { notFound } from "next/navigation";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import contentIndex from "../../../../content/generated/content-index.json";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NextUnitCard } from "@/components/NextUnitCard";
import { GoogleSignInLink } from "@/components/GoogleSignInLink";

import { prisma } from "@/lib/db";

export default async function PackHomePage(props: {
  params: Promise<{ packId: string }>;
}) {
  const { packId } = await props.params;

  const pack = (contentIndex as any).packs?.[packId];
  if (!pack) return notFound();

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const isAuthed = !!email;

  const hasPlan = await (async () => {
    if (!email) return false;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return false;
    const count = await prisma.skillRating.count({ where: { userId: user.id, packId } });
    return count > 0;
  })();

  const manifest = pack.manifest;
  const skills = pack.skills as any[];
  const units = Object.values(pack.unitsById ?? {}) as any[];

  const { makeUnitComparator } = await import("@/lib/content/sortUnits");
  const unitComparator = makeUnitComparator(pack.manifest);
  units.sort(unitComparator);

  // "Start here" heuristic:
  // - Prefer the first category + first level in the manifest
  // - Use unit order if provided
  const startCategoryId = String(manifest?.categories?.[0]?.id ?? "");
  const startLevelId = String(manifest?.levels?.[0]?.id ?? "working");

  const startHere = units
    .filter((u) => {
      if (!startCategoryId) return false;
      return String(u.categoryId ?? "") === startCategoryId && String(u.levelId ?? "") === startLevelId;
    })
    .slice(0, 8);

  const startHereFallback = units.slice(0, 8);
  const startHereUnits = startHere.length ? startHere : startHereFallback;

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{manifest?.name ?? packId}</CardTitle>
          <CardDescription>{manifest?.description ?? ""}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {!isAuthed ? (
            <GoogleSignInLink
              href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent(`/p/${packId}`)}`}
              className="h-9"
            />
          ) : hasPlan ? (
            <Button asChild className="rounded-full">
              <Link href={`/p/${packId}/plan`}>Continue plan</Link>
            </Button>
          ) : (
            <Button asChild className="rounded-full">
              <Link href={`/p/${packId}/skills?view=wizard`}>Start skills assessment</Link>
            </Button>
          )}

          <Button asChild variant="outline" className="rounded-full">
            <Link href={`/`}>Change pack</Link>
          </Button>

          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{skills.length} skills</Badge>
            <Badge variant="secondary">{units.length} units</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skills</CardTitle>
            <CardDescription>
              Browse skills as a list or a skills tree. {isAuthed ? "" : "No sign-in needed to browse."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild className="rounded-full">
                <Link href={`/p/${packId}/skills`}>View as list</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link href={`/p/${packId}/skills?view=tree`}>View as skills tree</Link>
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">Jump to a category:</div>
            <div className="flex flex-wrap gap-2">
              {(manifest?.categories ?? []).slice(0, 8).map((c: any) => (
                <Button key={c.id} asChild size="sm" variant="outline" className="rounded-full">
                  <Link href={`/p/${packId}/skills?categoryId=${encodeURIComponent(String(c.id))}`}>{c.title ?? c.id}</Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lessons</CardTitle>
            <CardDescription>Examples of lessons to start with.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {startHereUnits.length ? (
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {startHereUnits.slice(0, 4).map((u) => (
                  <li key={u.id}>
                    <Link className="font-medium text-primary hover:underline" href={`/p/${packId}/lessons/${u.id}`}>
                      {u.title ?? u.id}
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-sm text-muted-foreground">No lessons yet.</div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild className="rounded-full">
                <Link href={`/p/${packId}/lessons`}>Browse all lessons</Link>
              </Button>
              {isAuthed ? (
                <Button asChild variant="outline" className="rounded-full">
                  <Link href={`/p/${packId}/plan`}>Your training plan</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
