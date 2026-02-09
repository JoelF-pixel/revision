import { prisma } from "@/lib/db";

export async function GET() {
  const email = "smoke-test@local";

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: "Smoke Test" },
    create: { email, name: "Smoke Test" },
  });

  const rating = await prisma.skillRating.upsert({
    where: {
      userId_packId_skillId: {
        userId: user.id,
        packId: "govuk-prototyping",
        skillId: "what-is-routing",
      },
    },
    update: { rating: 2 },
    create: { userId: user.id, packId: "govuk-prototyping", skillId: "what-is-routing", rating: 2 },
  });

  const counts = {
    users: await prisma.user.count(),
    skillRatings: await prisma.skillRating.count(),
  };

  return Response.json({ ok: true, user, rating, counts });
}
