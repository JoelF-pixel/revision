import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

import Link from "next/link";

import { SkillRatingSelect } from "@/components/SkillRatingSelect";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export async function SkillDetailPanel({
  packId,
  skill,
  unitsById,
  skillNumber,
}: {
  packId: string;
  skill: any;
  unitsById: Record<string, any>;
  skillNumber?: number | null;
}) {
  const sourcePath = skill?.sourcePath as string | undefined;
  if (!sourcePath) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skill</CardTitle>
          <CardDescription>Not found.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const filePath = path.join(process.cwd(), sourcePath);
  if (!fs.existsSync(filePath)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skill</CardTitle>
          <CardDescription>Source file missing.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = matter(raw);
  const d: any = parsed.data || {};
  const body = parsed.content;

  const rehypePrettyCode = (await import("rehype-pretty-code")).default;

  const title = d.name ?? d.title ?? skill?.name ?? skill?.id;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {typeof skillNumber === "number" ? (
                <Badge variant="secondary">#{skillNumber}</Badge>
              ) : null}
              <CardTitle className="text-2xl">{title}</CardTitle>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {String(d.quadrant ?? skill?.quadrant ?? "").trim() ? (
                <Badge variant="secondary">{String(d.quadrant ?? skill?.quadrant)}</Badge>
              ) : null}
              {String(d.ring ?? skill?.ring ?? "").trim() ? (
                <Badge variant="outline">{String(d.ring ?? skill?.ring)}</Badge>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SkillRatingSelect packId={packId} skillId={String(skill.id)} className="w-[190px]" />
          </div>
        </CardHeader>
        <CardContent>
          <article className="prose prose-lg max-w-none dark:prose-invert skill-panel-prose">
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

          <div className="not-prose pt-10">
            <Button asChild className="btn-hippo-green w-full rounded-full">
              <Link href={`/p/${packId}/skills/${String(skill.id)}`}>View full skill details</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
