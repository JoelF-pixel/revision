import { redirect } from "next/navigation";

export default async function DeprecatedGlobalUnitRedirect(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  redirect(`/lessons/${id}`);
}
