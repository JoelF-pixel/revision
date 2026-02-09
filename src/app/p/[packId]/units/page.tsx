import { redirect } from "next/navigation";

export default async function DeprecatedUnitsIndex(props: {
  params: Promise<{ packId: string }>;
}) {
  const { packId } = await props.params;
  redirect(`/p/${packId}/lessons`);
}
