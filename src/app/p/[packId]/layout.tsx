import type { Metadata } from "next";

import contentIndex from "../../../../content/generated/content-index.json";

export async function generateMetadata(props: {
  params: Promise<{ packId: string }>;
}): Promise<Metadata> {
  const { packId } = await props.params;

  const pack = (contentIndex as any).packs?.[packId];
  const packName = pack?.manifest?.name ?? packId;

  return {
    title: `RevTree — ${packName}`,
    description: pack?.manifest?.description ?? `RevTree training pack: ${packName}`,
  };
}

export default function PackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
