import contentIndex from "../../../../../content/generated/content-index.json";
import { notFound } from "next/navigation";

import { SkillRadar } from "@/components/SkillRadar";

export default async function PackRadarPage(props: {
  params: Promise<{ packId: string }>;
}) {
  const { packId } = await props.params;

  const pack = (contentIndex as any).packs?.[packId];
  if (!pack) return notFound();

  return (
    <main className="mx-auto max-w-6xl p-6">
      <SkillRadar
        packId={packId}
        skills={pack.skills ?? []}
        unitsById={pack.unitsById ?? {}}
        manifest={pack.manifest}
        skillLinks={pack.skillLinks ?? []}
      />
    </main>
  );
}
