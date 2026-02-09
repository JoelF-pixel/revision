import fs from "node:fs";
import path from "node:path";
import Link from "next/link";

import matter from "gray-matter";
import { notFound } from "next/navigation";

import contentIndex from "../../../../../../content/generated/content-index.json";

import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

import { PreWithCopy } from "@/components/PreWithCopy";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { UnitProgressControl } from "@/components/UnitProgressControl";

export default async function PackLessonPage(props: {
  params: Promise<{ packId: string; id: string }>;
}) {
  const { packId, id } = await props.params;

  const pack = (contentIndex as any).packs?.[packId];
  if (!pack) return notFound();

  const lesson = pack.unitsById?.[id];
  if (!lesson?.sourcePath) return notFound();

  const filePath = path.join(process.cwd(), lesson.sourcePath);
  if (!fs.existsSync(filePath)) return notFound();

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = matter(raw);
  const d: any = parsed.data || {};
  const body = parsed.content;

  // Navigation: use the same ordering as the Lessons index.
  const { makeUnitComparator } = await import("@/lib/content/sortUnits");
  const allUnits = Object.values(pack.unitsById ?? {}) as any[];
  allUnits.sort(makeUnitComparator(pack.manifest));
  const i = allUnits.findIndex((u) => u.id === id);
  const prevUnit = i > 0 ? allUnits[i - 1] : null;
  const nextUnit = i >= 0 && i < allUnits.length - 1 ? allUnits[i + 1] : null;

  const teaches: string[] = Array.isArray(d.teaches) ? d.teaches.map(String) : [];
  const doneWhen: string[] = Array.isArray(d.doneWhen) ? d.doneWhen.map(String) : [];
  const estimatedMinutes =
    typeof d.estimatedMinutes === "number" ? d.estimatedMinutes : d.estimatedMinutes ? Number(d.estimatedMinutes) : null;
  const difficulty = d.difficulty ? String(d.difficulty) : null;

  const rehypePrettyCode = (await import("rehype-pretty-code")).default;

  return (
    <main className="mx-auto max-w-6xl p-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/p/${packId}/lessons`}>Back to lessons</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/p/${packId}/assessment`}>Assessment</Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <article className="prose prose-lg max-w-none dark:prose-invert">
            <header className="not-prose mb-6">
              <h1 className="text-3xl font-semibold leading-tight tracking-tight">{d.title ?? id}</h1>
              {d.summary ? <p className="mt-2">{String(d.summary)}</p> : null}
            </header>

            <MDXRemote
              source={body}
              components={{
                pre: PreWithCopy as any,
              }}
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
            <UnitProgressControl packId={packId} unitId={id} />

            {(estimatedMinutes || difficulty) ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">About this lesson</CardTitle>
                  <CardDescription>Time and difficulty.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  {typeof estimatedMinutes === "number" && Number.isFinite(estimatedMinutes) ? (
                    <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">{estimatedMinutes} min</span>
                  ) : null}
                  {difficulty ? (
                    <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">{difficulty}</span>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {doneWhen.length ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Done when</CardTitle>
                  <CardDescription>Use these criteria to decide when to mark the lesson complete.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  <ul className="list-disc pl-5">
                    {doneWhen.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            {teaches.length ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Teaches</CardTitle>
                  <CardDescription>Skills covered by this lesson.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  <ul className="list-disc pl-5">
                    {teaches.map((sid) => {
                      const s = pack.skillsById?.[sid];
                      return (
                        <li key={sid}>
                          <Link className="text-primary hover:underline" href={`/p/${packId}/skills/${sid}`}>
                            {s?.name ?? sid}
                          </Link>
                          {s?.ring || s?.quadrant ? (
                            <span className="text-muted-foreground"> — {s?.quadrant} · {s?.ring}</span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Navigate</CardTitle>
                <CardDescription>Continue through the units.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button variant="outline" asChild disabled={!prevUnit}>
                  <Link href={prevUnit ? `/p/${packId}/lessons/${prevUnit.id}` : "#"}>
                    ← Prev{prevUnit ? `: ${prevUnit.title}` : ""}
                  </Link>
                </Button>
                <Button asChild disabled={!nextUnit}>
                  <Link href={nextUnit ? `/p/${packId}/lessons/${nextUnit.id}` : "#"}>
                    Next{nextUnit ? `: ${nextUnit.title}` : ""} →
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </CardContent>
      </Card>
    </main>
  );
}

