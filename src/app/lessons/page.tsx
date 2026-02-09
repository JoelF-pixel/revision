import { redirect } from "next/navigation";

import contentIndex from "../../../content/generated/content-index.json";

export default function LessonsRoot() {
  const packId = (contentIndex as any).defaultPackId as string;
  redirect(`/p/${packId}/lessons`);
}
