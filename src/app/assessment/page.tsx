import { redirect } from "next/navigation";
import contentIndex from "../../../content/generated/content-index.json";

export default function AssessmentRedirectPage() {
  const packId = (contentIndex as any).defaultPackId;
  redirect(`/p/${packId}/assessment`);
}
