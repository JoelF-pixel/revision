import fs from "node:fs";
import path from "node:path";
import Link from "next/link";

import matter from "gray-matter";
import { notFound } from "next/navigation";

import contentIndex from "../../../../../../content/generated/content-index.json";
import { SkillRater } from "@/components/SkillRater";

import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Skill = any;

function orderedSkills(pack: any): Skill[] {
  const skills: Skill[] = (pack?.skills ?? []) as Skill[];

  const categoryOrder: string[] = (pack?.manifest?.categories ?? []).map((c: any) => String(c.id));
  const levelOrder: string[] = (pack?.manifest?.levels ?? []).map((l: any) => String(l.id));

  const catRank = new Map(categoryOrder.map((id, i) => [id, i]));
  const lvlRank = new Map(levelOrder.map((id, i) => [id, i]));

  return skills.slice().sort((a: any, b: any) => {
    const la = lvlRank.get(String(a.levelId)) ?? 999;
    const lb = lvlRank.get(String(b.levelId)) ?? 999;
    if (la !== lb) return la - lb;

    const ca = catRank.get(String(a.categoryId)) ?? 999;
    const cb = catRank.get(String(b.categoryId)) ?? 999;
    if (ca !== cb) return ca - cb;

    return (Number(a.order ?? 0) - Number(b.order ?? 0)) || String(a.name).localeCompare(String(b.name));
  });
}

export default async function PackSkillPage(props: {
  params: Promise<{ packId: string; id: string }>;
}) {
  const { packId, id } = await props.params;

  const pack = (contentIndex as any).packs?.[packId];
  if (!pack) return notFound();

  const skill = pack.skillsById?.[id];
  if (!skill?.sourcePath) return notFound();

  const filePath = path.join(process.cwd(), skill.sourcePath);
  if (!fs.existsSync(filePath)) return notFound();

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = matter(raw);
  const d: any = parsed.data || {};
  const body = parsed.content;

  const all = orderedSkills(pack);

  // Global skill numbering: level -> category -> order -> name
  const skillNumberById = (() => {
    const categories: string[] = (pack?.manifest?.categories ?? []).map((c: any) => String(c.id));
    const levels: string[] = (pack?.manifest?.levels ?? []).map((l: any) => String(l.id));

    const byLevelThenCategory: Record<string, Record<string, any[]>> = {};
    for (const s of pack?.skills ?? []) {
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
      const sid = String(s.id);
      if (!sid) continue;
      if (map[sid]) continue;
      map[sid] = n++;
    }
    return map;
  })();

  const idx = all.findIndex((s: any) => s.id === id);
  const prev = idx > 0 ? (all[idx - 1] as any) : null;
  const next = idx >= 0 && idx < all.length - 1 ? (all[idx + 1] as any) : null;

  const rehypePrettyCode = (await import("rehype-pretty-code")).default;

  return (
    <main className="mx-auto max-w-6xl p-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link href={`/p/${packId}/skills`}>Back to skills</Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <article className="prose prose-lg max-w-none dark:prose-invert">
            <header className="not-prose mb-6">
              <div className="flex flex-wrap items-center gap-2">
                {typeof skillNumberById[String(id)] === "number" ? (
                  <span className="rounded-md bg-neutral-500 px-2 py-1 text-xs font-medium text-white tabular-nums">
                    #{skillNumberById[String(id)]}
                  </span>
                ) : null}
                <h1 className="text-3xl font-semibold leading-tight tracking-tight">{d.name ?? d.title ?? id}</h1>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {d.quadrant} · {d.ring}
              </p>
            </header>
            <MDXRemote
              source={body}
              options={{
                mdxOptions: {
                  remarkPlugins: [remarkGfm],
                  rehypePlugins: [
                    rehypeSlug,
                    [
                      rehypePrettyCode,
                      {
                        theme: {
                          dark: "github-dark",
                          light: "github-light",
                        },
                        keepBackground: false,
                      },
                    ],
                  ],
                },
              }}
            />
          </article>

          <aside className="space-y-4">
            <SkillRater packId={packId} skillId={id} />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Navigate</CardTitle>
                <CardDescription>Follow the recommended traversal order.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button variant="outline" asChild disabled={!prev}>
                  <Link href={prev ? `/p/${packId}/skills/${prev.id}` : "#"}>
                    ← Prev{prev ? `: ${prev.name}` : ""}
                  </Link>
                </Button>
                <Button asChild disabled={!next}>
                  <Link href={next ? `/p/${packId}/skills/${next.id}` : "#"}>
                    Next{next ? `: ${next.name}` : ""} →
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Learning units</CardTitle>
                <CardDescription>Exercises/pages that teach this skill.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.isArray(skill.taughtByUnits) && skill.taughtByUnits.length > 0 ? (
                  <ul className="space-y-2">
                    {skill.taughtByUnits.map((unitId: string) => {
                      const u = pack.unitsById?.[unitId];
                      return (
                        <li key={unitId} className="rounded-md border p-2">
                          <Link className="font-medium text-primary hover:underline" href={`/p/${packId}/lessons/${unitId}`}>
                            {u?.title ?? unitId}
                          </Link>
                          {u?.summary ? (
                            <div className="mt-1 text-xs text-muted-foreground">{u.summary}</div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="text-sm text-muted-foreground">No units linked yet.</div>
                )}
                <div className="text-xs text-muted-foreground">skill id: {id}</div>
              </CardContent>
            </Card>
          </aside>
        </CardContent>
      </Card>
    </main>
  );
}
