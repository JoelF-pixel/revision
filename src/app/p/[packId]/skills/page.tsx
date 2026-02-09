import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

import contentIndex from "../../../../../content/generated/content-index.json";

import { SkillRadar } from "@/components/SkillRadar";
import { AssessmentWizard } from "@/components/AssessmentWizard";
import { GoogleSignInLink } from "@/components/GoogleSignInLink";
import { SkillDetailPanel } from "@/components/SkillDetailPanel";
import { SkillListWithRatings } from "@/components/SkillListWithRatings";
import { StickyPanelScrollReset } from "@/components/StickyPanelScrollReset";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function viewHref(
  packId: string,
  view: string,
  categoryId?: string | null,
  skillId?: string | null,
  sort?: string | null,
) {
  const params = new URLSearchParams();
  if (view && view !== "list") params.set("view", view);
  if (categoryId) params.set("categoryId", categoryId);
  if (skillId) params.set("skillId", skillId);
  if (sort) params.set("sort", sort);
  const qs = params.toString();
  return `/p/${packId}/skills${qs ? `?${qs}` : ""}`;
}

function buildSkillNumberById(pack: any): Record<string, number> {
  const skills = (pack?.skills ?? []) as any[];
  const categories: string[] = (pack?.manifest?.categories ?? []).map((c: any) => String(c.id));
  const levels: string[] = (pack?.manifest?.levels ?? []).map((l: any) => String(l.id));

  const byLevelThenCategory: Record<string, Record<string, any[]>> = {};
  for (const s of skills) {
    const lvl = String(s.levelId ?? "").trim() || "unknown";
    const cat = String(s.categoryId ?? "").trim() || "uncategorised";
    byLevelThenCategory[lvl] ||= {};
    byLevelThenCategory[lvl][cat] ||= [];
    byLevelThenCategory[lvl][cat].push(s);
  }

  function skillComparator(a: any, b: any) {
    const oa = Number(a.order ?? 0);
    const ob = Number(b.order ?? 0);
    if (oa !== ob) return oa - ob;
    return String(a.name ?? a.id).localeCompare(String(b.name ?? b.id));
  }

  const out: any[] = [];

  const levelOrder = [...levels, ...Object.keys(byLevelThenCategory).filter((x) => !levels.includes(x)).sort()];
  for (const lvl of levelOrder) {
    const byCat = byLevelThenCategory[lvl];
    if (!byCat) continue;

    const catOrder = [...categories, ...Object.keys(byCat).filter((x) => !categories.includes(x)).sort()];
    for (const cat of catOrder) {
      const list = byCat[cat];
      if (!list?.length) continue;
      list.sort(skillComparator);
      out.push(...list);
    }
  }

  const map: Record<string, number> = {};
  let n = 1;
  for (const s of out) {
    const id = String(s.id);
    if (!id) continue;
    if (map[id]) continue;
    map[id] = n++;
  }
  return map;
}

function orderedSkills(pack: any, sort: string | null): any[] {
  const skills = (pack?.skills ?? []) as any[];
  const categoryOrder: string[] = (pack?.manifest?.categories ?? []).map((c: any) => String(c.id));
  const levelOrder: string[] = (pack?.manifest?.levels ?? []).map((l: any) => String(l.id));

  const catRank = new Map(categoryOrder.map((id, i) => [id, i]));
  const lvlRank = new Map(levelOrder.map((id, i) => [id, i]));

  return skills.slice().sort((a: any, b: any) => {
    const la = lvlRank.get(String(a.levelId)) ?? 999;
    const lb = lvlRank.get(String(b.levelId)) ?? 999;
    const ca = catRank.get(String(a.categoryId)) ?? 999;
    const cb = catRank.get(String(b.categoryId)) ?? 999;

    if (sort === "level") {
      if (la !== lb) return la - lb;
      if (ca !== cb) return ca - cb;
    } else if (sort === "number") {
      // Use explicit ordering first (closest to "number" in the old matrix), then category/level.
      const oa = Number(a.order ?? 0);
      const ob = Number(b.order ?? 0);
      if (oa !== ob) return oa - ob;
      if (ca !== cb) return ca - cb;
      if (la !== lb) return la - lb;
    } else {
      // Default: sort by category.
      if (ca !== cb) return ca - cb;
      if (la !== lb) return la - lb;
    }

    return (Number(a.order ?? 0) - Number(b.order ?? 0)) || String(a.name).localeCompare(String(b.name));
  });
}

export default async function PackSkillsPage(props: {
  params: Promise<{ packId: string }>;
  searchParams?: Promise<{ view?: string; categoryId?: string; skillId?: string; sort?: string }>;
}) {
  const { packId } = await props.params;
  const sp = (await props.searchParams) ?? {};

  const pack = (contentIndex as any).packs?.[packId];
  if (!pack) return notFound();

  const view = sp.view ? String(sp.view) : "list";
  const categoryId = sp.categoryId ? String(sp.categoryId) : null;
  const selectedSkillId = sp.skillId ? String(sp.skillId) : null;
  const sort = sp.sort ? String(sp.sort) : "category";
  const normalizedSort = sort === "number" ? "level" : sort;

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;

  const hasPlan = await (async () => {
    if (!user) return false;
    const count = await prisma.skillRating.count({ where: { userId: user.id, packId } });
    return count > 0;
  })();

  const wizardAllowed = !!user && !hasPlan;

  // If someone deep-links to wizard but it isn't relevant, bounce to list.
  if (view === "wizard" && !wizardAllowed) {
    redirect(viewHref(packId, "list", categoryId, selectedSkillId, sort));
  }

  const skillNumberById = buildSkillNumberById(pack);

  const skillsInOrder = orderedSkills(pack, normalizedSort).filter((s) => {
    if (!categoryId) return true;
    return String(s.categoryId ?? "") === categoryId;
  });

  const selectedSkill = selectedSkillId ? pack.skillsById?.[selectedSkillId] : null;

  return (
    <main className="mx-auto max-w-6xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight">Skills</h1>
          </CardTitle>
          <CardDescription>
            Browse skills as a list or as a skills tree.
            {user ? "" : " Sign in to rate your skills and unlock a personalised plan."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant={view === "list" ? "secondary" : "outline"} className="h-9 rounded-full">
              <Link href={viewHref(packId, "list", categoryId, selectedSkillId, sort)}>View as list</Link>
            </Button>
            <Button asChild variant={view === "tree" ? "secondary" : "outline"} className="h-9 rounded-full">
              <Link href={viewHref(packId, "tree", categoryId, null, sort)}>View as skills tree</Link>
            </Button>
            {wizardAllowed ? (
              <Button asChild variant={view === "wizard" ? "secondary" : "outline"} className="h-9 rounded-full">
                <Link href={viewHref(packId, "wizard", null, null, sort)}>Wizard</Link>
              </Button>
            ) : null}

            <div className="ml-auto" />

            {!user ? (
              <GoogleSignInLink
                href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent(`/p/${packId}/skills`)}`}
                className="h-9 shrink-0"
              />
            ) : null}
          </div>

          {view === "tree" ? (
            <SkillRadar
              packId={packId}
              skills={pack.skills ?? []}
              unitsById={pack.unitsById ?? {}}
              manifest={pack.manifest}
              skillLinks={pack.skillLinks ?? []}
            />
          ) : view === "wizard" ? (
            <AssessmentWizard
              packId={packId}
              categories={(pack.manifest?.categories ?? []) as any[]}
              skills={(pack.skills ?? []) as any[]}
              onDone={() => {
                // no-op; server page will refresh on navigation
              }}
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-2xl">{user ? "Self-assessment" : "Skills list"}</CardTitle>
                      <CardDescription>
                        {user
                          ? "Select a skill to read details, then rate it on the right."
                          : "Select a skill to read details. Sign in to rate your skills."}
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        asChild
                        size="sm"
                        variant={sort === "category" ? "secondary" : "outline"}
                        className="rounded-full"
                      >
                        <Link href={viewHref(packId, "list", categoryId, selectedSkillId, "category")}>Sort by: category</Link>
                      </Button>
                      <Button
                        asChild
                        size="sm"
                        variant={normalizedSort === "level" ? "secondary" : "outline"}
                        className="rounded-full"
                      >
                        <Link href={viewHref(packId, "list", categoryId, selectedSkillId, "level")}>Sort by: level</Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <SkillListWithRatings
                    packId={packId}
                    skills={skillsInOrder}
                    selectedSkillId={selectedSkillId}
                    categoryId={categoryId}
                    sort={sort}
                    manifest={pack.manifest}
                    skillNumberById={skillNumberById}
                  />
                </CardContent>
              </Card>

              <StickyPanelScrollReset
                selectedKey={selectedSkillId}
                className="md:sticky md:top-24 self-start max-h-[calc(100vh-7rem)] overflow-auto"
              >
                {selectedSkill ? (
                  <SkillDetailPanel
                    packId={packId}
                    skill={selectedSkill}
                    unitsById={pack.unitsById ?? {}}
                    skillNumber={selectedSkillId ? skillNumberById[String(selectedSkillId)] ?? null : null}
                  />
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Pick a skill</CardTitle>
                      <CardDescription>Select a skill from the list to see details here.</CardDescription>
                    </CardHeader>
                  </Card>
                )}
              </StickyPanelScrollReset>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
