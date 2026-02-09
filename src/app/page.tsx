import Link from "next/link";

import contentIndex from "../../content/generated/content-index.json";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  const packs = (contentIndex as any).packs ?? {};
  const packList = Object.values(packs) as any[];

  // Stable ordering: manifest name, then id.
  packList.sort((a, b) => {
    const an = String(a?.manifest?.name ?? a?.manifest?.id ?? "");
    const bn = String(b?.manifest?.name ?? b?.manifest?.id ?? "");
    const r = an.localeCompare(bn);
    if (r !== 0) return r;
    return String(a?.manifest?.id ?? "").localeCompare(String(b?.manifest?.id ?? ""));
  });

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">RAFT</CardTitle>
          <CardDescription>Pick a pack to start learning or continue where you left off.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {packList.map((p) => {
              const id = String(p?.manifest?.id ?? "");
              const name = String(p?.manifest?.name ?? id);
              const desc = String(p?.manifest?.description ?? "");
              const skillsCount = (p?.skills?.length ?? Object.values(p?.skillsById ?? {}).length ?? 0) as number;
              const unitsCount = (p?.units?.length ?? Object.values(p?.unitsById ?? {}).length ?? 0) as number;

              return (
                <Card key={id}>
                  <CardHeader>
                    <CardTitle className="text-base">{name}</CardTitle>
                    <CardDescription>{desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-3">
                    <Button asChild>
                      <Link href={`/p/${id}`}>Open pack</Link>
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      {skillsCount} skills · {unitsCount} units
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

