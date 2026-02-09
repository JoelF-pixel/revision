import { redirect } from "next/navigation";

export default async function DeprecatedUnitPage(props: {
  params: Promise<{ packId: string; id: string }>;
}) {
  const { packId, id } = await props.params;
  redirect(`/p/${packId}/lessons/${id}`);
}
