import { redirect } from "next/navigation";
import contentIndex from "../../../../content/generated/content-index.json";

export default async function UnitRedirectPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const packId = (contentIndex as any).defaultPackId;
  redirect(`/p/${packId}/lessons/${id}`);
}
